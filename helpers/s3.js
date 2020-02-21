var aws = require('aws-sdk')
var multer = require('multer')
var multerS3 = require('multer-s3')
var client = require('../redis.js')
var fs = require('fs')
aws.config.update({region: 'us-west-1'});

var sharp = require('sharp');
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvg = require('imagemin-svgo');
const imageminWebp = require('imagemin-webp');
const imageminGif = require('imagemin-gifsicle');


var s3 = new aws.S3({
	dirname: '/',
	bucket: 'images.eh.rafaelancheta.com',
	secretAccessKey: process.env.AWS_SECRET || 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
	accessKeyId: process.env.AWS_KEY || 'XXXXXXXXXXXXXXX',
	region: 'us-west-1',
})

// Call S3 to list the buckets
if (process.env.ENV && process.env.ENV !== 'production') {
	s3.listBuckets(function(err, data) {
	  if (err) {
	    console.error("Error", err);
	  } else {
	    console.log("Success Connecting to S3\n", data.Buckets);
	  }
	});
}

function deleteFromCache(profileName, profileId, cb){
	var sKey = 'profile-images/' +  decodeURIComponent(dashReplacer(profileName).replace(/:/g,'%3A'))+ '-' + profileId 
	client.del("skey:" + sKey, cb ? cb : null)
}

async function deleteImage(key, cb){
	return await s3.deleteObject({
				  Bucket: 'images.eh.rafaelancheta.com',
				  Key: decodeURIComponent(key)
				}).promise()
}

function mapImagesFromS3(profileName, profileId, S3Data){
  var baseDomain = 'https://images.eh.rafaelancheta.com/'
	var images = S3Data.Contents
	imageContainer = images.map((i) => {
		return baseDomain + encodeNameURI(i.Key)
	})
	return imageContainer
}

function dashReplacer(name){
	return name.replace(/-| /g,(match) => {
			if (match === '-') {
				return '--'
			} else if (match === ' ') {
				return '-'
			}
		})
	}

function getProfileImages(profileName, profileId, tryAgain, cb) {
	var sKey = 'profile-images/' +  decodeURIComponent(dashReplacer(profileName))+ '-' + profileId 
	if (tryAgain && sKey.match(/---/g)) {
		sKey = sKey.replace(/---/g, '--')
	}
	var params = { 
	  Bucket: 'images.eh.rafaelancheta.com',
	  Prefix: sKey
	}

	client.get("skey:" + sKey, function (error, cachedImages) {
    if (error) {
        console.error(error);
        cb(error, null)
    }
		if (cachedImages) {
			try {
				var jsonImages = JSON.parse(cachedImages)
			} catch(err) {
				deleteFromCache(profileName, profileId)
				cb(err, null)
				return
			}
	    cb(null, jsonImages)
		} else {
			s3.listObjects(params, function (err, data) {
			  if(err){
			  	console.error(err)
			  	cb(err, null)
			  	return
			  };
			  if (data.Contents.length === 0 && tryAgain) {
			  	getProfileImages(profileName, profileId, false, cb)
			  	return
			  }
			  const imageMap =  mapImagesFromS3(profileName, profileId, data)
			  if (data.Contents.length > 0) {
					client.set("skey:" + sKey, JSON.stringify(imageMap));
			  }
			  cb(err, imageMap)
			});
		}
	});
}

async function getImagesKeys(sKey) {
	var params = { 
	  Bucket: 'images.eh.rafaelancheta.com',
	  Prefix: sKey
	}
	const keyData = await s3.listObjects(params).promise()

	if (!keyData || !keyData.Contents || keyData.Contents.length === 0) {
		return null
	}
	var keys = keyData.Contents.map((i) => {
		return i.Key
	})
	return keys
}

function deleteUserImage(sKey, username, cb){
	getImagesKeys(sKey, (err, keys) => {
		if (err) {console.error(err); cb(err, null); return;}
		if (!keys || keys.length === 0) {
			cb(null, null)
			return
		}
		for (var i = 0; i < keys.length; i++) {
			// since usually only 1 image is deleted this is probably fine
			let key = keys[i]
			if (key.match('profile-images/' + username + '/')) {
				deleteImage(key, (err, data) => {})
			}
		}
		// This is super jank fix later
		setTimeout(function(){
			cb(null, null);
		}, 800)
	})
}

var encodings = {
  '\+': "%2B",
  '\!': "%21",
  '\"': "%22",
  '\#': "%23",
  '\$': "%24",
  '\&': "%26",
  '\'': "%27",
  '\(': "%28",
  '\)': "%29",
  '\*': "%2A",
  '\,': "%2C",
  '\:': "%3A",
  '\;': "%3B",
  '\=': "%3D",
  '\?': "%3F",
  '\@': "%40",
  '\/': "%2F",
};

function encodeName(name) {
	if (!name) { return '' }
  return name.replace(/ /g, '-').replace(
                  /(\+|!|"|#|\$|&|'|\(|\)|\*|\+|,|:|;|=|\?|@|\/)/img,
                  function(match) { return encodings[match]; }
              );

}

function encodeNameURI(name) {
	if (!name) { return '' }
  return name.replace(/ /g, '-').replace(
                  /(\+|!|"|#|\$|&|'|\(|\)|\*|\+|,|:|;|=|\?|@)/img,
                  function(match) { return encodings[match]; }
              );

}

function insertImageByBuffer(imgBuffer, imageOptions, cb){
	var imageType = ''
	var isThumb = imageOptions.imageType === 'thumb'
	if (isThumb) {
		var imageType = 'thumb/'
	}

	const image = sharp(imgBuffer);
	image
	  .metadata()
	  .then(function(metadata) {
	  	if (isThumb || imageOptions.singleImageGif) {
	  		metadata.singleImageGif = true
	  	}
			resizeImage(imgBuffer, imageOptions.resizeWidth, metadata, metadata.format, (err, fdata) => {
				if (err) {console.error(err); cb(err, null); return;}
				minimizeImage(fdata, metadata.format, false, (err, minBuffer) => {
					if (err) {console.error(err); cb(err, null); return}
					var uriName = imageOptions.profileName
					if(imageOptions.s3Key ){
						var sKey = imageOptions.s3Key + '.' + metadata.format;
					} else {
						cb('no s3 key', null)
						return
					}
					const params = {
						Bucket: 'images.eh.rafaelancheta.com',
						Key: sKey,
						Body: minBuffer,
						ContentType: imageOptions.type
					};
				 	s3.putObject(params, function(err, data) {
						if (err) {
							console.error(err);		
							cb(err, null)
							return
						}
						cb(null, sKey)
					});
				})
			})
	  }).catch((err) => {
			console.error(err)
			cb('error', {error: { status: 500 }, message: "Error sending image"})
		})
}


function insertImage(file, imageOptions, cb){
	var imageType = ''
	var isThumb = imageOptions.imageType === 'thumb'
	if (isThumb) {
		var imageType = 'thumb/'
	}

	const image = sharp(file.path);
	image
	  .metadata()
	  .then(function(metadata) {
	  	if (isThumb || imageOptions.singleImageGif) {
	  		metadata.singleImageGif = true
	  	}
			resizeImage(file.path, imageOptions.resizeWidth, metadata, metadata.format, (err, fdata) => {
				if (err) {console.error(err); cb(err, null); return;}
				minimizeImage(fdata, metadata.format, false, (err, minBuffer) => {
					if (err) {console.error(err); cb(err, null); return}
					var uriName = imageOptions.profileName
					if(imageOptions.s3Key ){
						var sKey = imageOptions.s3Key + '.' + metadata.format;
					} else {
						cb('no s3 key', null)
						return
					}
					const params = {
						Bucket: 'images.eh.rafaelancheta.com',
						Key: sKey,
						Body: minBuffer,
						ContentType: file.type
					};
				 	s3.putObject(params, function(err, data) {
						if (err) {
							console.error(err);		
							cb(err, null)
							return
						}
						cb(null, sKey)
					});
				})
			})
	  }).catch((err) => {
			console.error(err)
			cb('error', {error: { status: 500 }, message: "Error sending image"})
		})
}

function insertVideo(vidBuffer, imageOptions, cb){
	if (imageOptions && imageOptions.name && (!imageOptions.name.toLowerCase().match('.mp4') && !imageOptions.name.toLowerCase().match('.ogg'))) {
		console.error('Video format not supported', imageOptions.name)
		cb('wrong format', null)
		return		
	}
	if(imageOptions.s3Key ){
		var sKey = imageOptions.s3Key
	} else {
		cb('no s3 key', null)
		return
	}
	const params = {
		Bucket: 'images.eh.rafaelancheta.com',
		Key: sKey,
		Body: vidBuffer,
		ContentType: imageOptions.type
	};
 	s3.putObject(params, function(err, data) {
		if (err) {
			console.error(err);		
			cb(err, null)
			return
		}
		cb(null, sKey)
	});
}


function resizeImage(buffer, desiredWidth, imageMeta, contentType, cb){
	var sharper = sharp(buffer)

	if (imageMeta.width > desiredWidth) {
		sharper.resize({width : desiredWidth || 800})
	}

	if (contentType === "image/jpeg" || contentType === 'jpeg') {
		sharper.jpeg({quality: 90})
	}	else if (contentType === "image/png" || contentType === 'png') {
		sharper.png({quality: 90})
	}	else if (contentType === "image/gif" || contentType === 'gif') {
		if (imageMeta.singleImageGif) {
			sharper.png({quality: 90})
		} else {
			// No support for gif resizing
			cb(null, buffer)
			var sharper = null
			return			
		}
	}	else if (contentType === "image/webp" || contentType === 'webp') {
		sharper.webp({quality: 90})
	}	else if (contentType === "image/tiff" || contentType === 'tiff') {
		sharper.tiff({quality: 90})
	}	else {
		console.log("No input type found")
		cb(true, buffer)
		return
	}
	// sharper.toFile("./tmp/" + s3Key.split(/\//g)[s3Key.split(/\//g).length - 1])
	sharper.toBuffer()
	.then( fdata => { 
		cb(null, fdata)
	}).catch( err => { 
		cb(err, null)
	});

}

// Clean this up later
function minimizeImage(image, contentType, convertGifs, cb){
	let plugins = []
	if (contentType === "image/jpeg") {
		plugins = [imageminJpegtran()]
	}	else if (contentType === "image/png" || contentType === 'png') {
		plugins = [imageminPngquant()]
	}	else if ((contentType === "image/gif" || contentType === 'gif') && !convertGifs) {
		plugins = [imageminGif({optimizationLevel: 2, colors: 150})]
	}	else if ((contentType === "image/gif" || contentType === 'gif') && convertGifs) {
		plugins = [imageminPngquant()]
	}	else if (contentType === "image/webp" || contentType === 'webp') {
		plugins = [imageminWebp()]
	}	else if (contentType === "image/tiff" || contentType === 'tiff') {
		cb(null, image)
		return
	}	else if (contentType === "image/svg+xml" || contentType.match('svg')) {
		plugins = [imageminSvg()]
	}	else {
		console.log("No input type found")
		cb(null, image)
		return
	}
	if (typeof image === 'string') {
		imagemin([image], '/tmp', { plugins : plugins})
		.then((dataArray) => {
			cb(null, dataArray ? dataArray[0].data : null)
		}).catch((err) => {
			console.error(err)
			cb(err, null)
		})
	} else {
		imagemin.buffer(image,{ plugins : plugins})
		.then((minBuffer) => {
			cb(null, minBuffer)
		}).catch((err) => {
			console.error(err)
			cb(err, null)
		})
	}
}

module.exports = {
	s3 : s3,
	deleteImage : deleteImage,
	getProfileImages : getProfileImages,
	encodeName: encodeName,
	deleteFromCache: deleteFromCache,
	insertImage: insertImage,
	insertImageByBuffer: insertImageByBuffer,
	resizeImage: resizeImage,
	minimizeImage: minimizeImage,
	getImagesKeys: getImagesKeys,
	deleteUserImage:deleteUserImage,
	insertVideo:insertVideo,
}
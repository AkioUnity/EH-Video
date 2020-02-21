const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const router = express.Router();
const S3 = require('../helpers/s3.js')
const {ensureAuthenticated} = require('../helpers/auth');

require('../models/User');
const User = mongoose.model('users');

router.post('/upload', ensureAuthenticated, async (req, res) => {
	const pubKeys = await S3.getImagesKeys(`profile-images/public/${req.user.name}`)
	const priKeys = await S3.getImagesKeys(`profile-images/private/${req.user.name}`)
	if (pubKeys && pubKeys.length >= 10) {
		req.flash('error_msg', 'Max images uploaded');
		res,redirect('back')
		return
	}
	if (priKeys && priKeys.length >= 10) {
		req.flash('error_msg', 'Max images uploaded');
		res,redirect('back')
		return
	}

	console.log(req.files)
	var file = req.files.file

	var isPrivate = false
	var isVideo = false
	if (req.body.private === 'true') {
		isPrivate = true
	}
	if (file.mimetype.match('ogg') || file.mimetype.match('mp4')) {
		isVideo = true
	}

	if (isVideo) {
		var imageOptions = {name: file.name,
							type: file.mimetype,
							s3Key: `profile-images/${req.user.name}/${isPrivate ? 'private' : 'public'}/video/${file.name}`  }
		S3.insertVideo(file.data, imageOptions , (err) => {
			if (err) {
		      req.flash('error_msg', 'Error uploading image');
		      res.redirect('back')
			} else {
		      req.flash('success_msg', 'Image Uploaded');
		      res.redirect('back')
			}
		})
	} else {
		var imageOptions = {resizeWidth: 800, 
							type: file.mimetype,
							s3Key: `profile-images/${req.user.name}/${isPrivate ? 'private' : 'public'}/${file.name.split('.')[0]}`  }
		S3.insertImageByBuffer(file.data, imageOptions , (err) => {
			if (err) {
		      req.flash('error_msg', 'Error uploading');
		      res.redirect('back')
			} else {
		      req.flash('success_msg', isVideo ? 'Image Uploaded' : 'Video Uploaded' );
		      res.redirect('back')
			}
		})	
	}
});

router.post('/upload/video', ensureAuthenticated, async (req, res) => {
	const pubKeys = await S3.getImagesKeys(`profile-images/public/${req.user.name}`)
	const priKeys = await S3.getImagesKeys(`profile-images/private/${req.user.name}`)
	if (pubKeys && pubKeys.length >= 10) {
		req.flash('error_msg', 'Max images uploaded');
		res,redirect('back')
		return
	}
	if (priKeys && priKeys.length >= 10) {
		req.flash('error_msg', 'Max images uploaded');
		res,redirect('back')
		return
	}

	var isPrivate = false
	var form = new formidable.IncomingForm();

	form.parse(req, function(err, fields, files) {

		if (fields.private) {
			isPrivate = true
		}

		const file = files['profile-video-upload']
		console.log(file)
		
		var imageOptions = {s3Key: `profile-images/${req.user.name}/${isPrivate ? 'private' : 'public'}/video/${file.name.toLowerCase()}`  }
		
		S3.insertVideo(file, imageOptions , (err) => {
			if (err) {
		      req.flash('error_msg', 'Error uploading image');
		      res.redirect('back')
			} else {
		      req.flash('success_msg', 'Image Uploaded');
		      res.redirect('back')
			}
		})
	});

});

// User Login Route
router.post('/delete', ensureAuthenticated, async (req, res) => {
	const deleteReq = await S3.deleteImage(req.body.key)
	console.log(deleteReq)
	if (deleteReq) {
      req.flash('success_msg', 'Image Deleted');
	} else {
      req.flash('error_msg', 'Error deleting image');
	}
	res.redirect('back')
});

module.exports = router;
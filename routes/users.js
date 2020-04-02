const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const multer = require('multer');
const router = express.Router();
const profileConfig = require('../config/profile.js').profile
const upload = multer({ dest: '../public/profile_images/'});
var Jimp = require('jimp');
const {ensureAuthenticated} = require('../helpers/auth');
const sendEmail = require('../helpers/mailer').sendEmail;
const S3 = require('../helpers/s3.js')

// Load User Model
require('../models/User');
const User = mongoose.model('users');

// User Login Route
router.get('/login', (req, res) => {
  res.render('users/login');
});

// User Register Route
router.get('/register', (req, res) => {
  res.render('users/register');
});

// User Profile Edit Route
router.get('/profile/edit', ensureAuthenticated, (req, res) => {
  if (!req.user || !req.user.name) {
    res.render('error', {errorStatus: 404})
    return
  }
  res.render('users/profile_edit', { profile: req.user, profileConfig: profileConfig });
});

// User Profile Edit Route
router.get('/account-settings', ensureAuthenticated, (req, res) => {
  if (!req.user || !req.user.name) {
    res.render('error', {errorStatus: 404})
    return
  }
  res.render('users/account_settings');
});

// Update Profile Route
router.post('/profile/edit', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.name) {
    res.render('error', {errorStatus: 400})
    return
  }
  let user = await User.findOneAndUpdate({name: req.user.name}, req.body, {new : true})
  req.session.passport.user = user
  req.session.save(function(err){
    if(err){console.log(err)}
    res.render('users/profile_edit', { profile: user,  profileConfig: profileConfig  });
  })
});

// Upload image route
router.post('/profile/image_upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
  if (!req.user || !req.user.name || !req.files.file) {
    console.log(req.files);
    res.render('error', {errorStatus: 500})
    return
  }
  var filename = path.join(__dirname, '..//public/profile_images/', req.user.name + '.jpg')
  Jimp.read(req.files.file.data, async (err, image) => {
    if (err) {
      console.log(err);
      console.log(req.files);
      res.render('error', {errorStatus: 500})
      return
    }
    image
      .resize(400, 400) // resize
      .quality(80) // set JPEG quality
      .write(filename); // save
    let user = await User.findOneAndUpdate({name: req.user.name}, {hasImage: true}, {new : true})
    req.session.passport.user = user
    req.session.save(function(err){
      if(err){console.log(err)}
      res.render('users/profile_edit', { profile: user,  profileConfig: profileConfig  });
    })

  });
});

// User Profile Route
router.get('/profile/:name', ensureAuthenticated, async (req, res) => {
  //const publicKeys = await S3.getImagesKeys(`profile-images/${req.params.name}/public`)
  //const privateKeys = await S3.getImagesKeys(`profile-images/${req.params.name}/private`)
  const profile = await User.findOne({name: req.params.name})
  if (profile) {
    res.render('users/profile', {profile: profile,
                                  isMyProfile: profile.name == (req.user ? req.user.name : null)}
    );
  } else {
    res.render('error', {errorStatus: 404})
  }
});

// Login Form POST
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect:'/home',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Register Form POST
router.post('/register', (req, res) => {
  let errors = [];

  if(req.body.password != req.body.password2){
    errors.push({text:'Passwords do not match'});
  }

  if(req.body.password.length < 4){
    errors.push({text:'Password must be at least 4 characters'});
  }

  if(errors.length > 0){
    res.render('users/register', {
      errors: errors,
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      password2: req.body.password2
    });
  } else {
    User.findOne({email: req.body.email})
      .then(user => {
        if(user){
          req.flash('error_msg', 'Email already regsitered');
          res.redirect('/users/register');
        } else {
          const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
          });

          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if(err) throw err;
              newUser.password = hash;
              newUser.save()
                .then(user => {
                  req.flash('success_msg', 'You are now registered and can log in');
                  res.redirect('/users/login');
                })
                .catch(err => {
                  console.log(err);
                  return;
                });
            });
          });
        }
      });
  }
});

router.get('/forgot-password', (req, res) => {
  res.render('users/forgot-password')
});

router.get('/reset-change-password', (req, res) => {
  if (req.query.email && req.query.key) {
    res.render('users/reset-change-password', {key: req.query.key, email: req.query.email})
  } else {
    res.render('error', {errorStatus: 400})
  }
});

router.post('/reset-change-password', async (req, res) => {
  // Check to make sure all is well with password and stuff
  var reqUser = await User.findOne({email: req.body.email})
  if (!reqUser || !reqUser.requested_reset) {
    req.flash('error_msg', 'Could not validate account, have you already reset your password?')
    res.redirect('back')
    return
  }
  if(req.body.new_password && req.body.new_password.length < 4){
    req.flash('error_msg', 'Password must be at least 4 characters')
    res.redirect('back')
    return
  }
  if (req.body.new_password != req.body.confirm_new) {
    req.flash('error_msg', 'New password confirm does not match.')
    res.redirect('back')
    return
  }

  var keyMatches = await bcrypt.compare(reqUser._id.toString(), req.body.key)
  // Update password if key matches
  if (keyMatches) {
    const salt = await bcrypt.genSalt(10)
    const passhash =  await bcrypt.hash(req.body.new_password, salt)
    reqUser.password = passhash
    reqUser.requested_reset = false
    await reqUser.save()
    req.flash('success_msg', 'Your password has been reset you may now login with your new password')
    res.redirect('back');
  } else {
    req.flash('error_msg', 'Could not validate account')
    res.redirect('back')
    return
  }
});

router.post('/reset-password', async (req, res, next) => {
  if (!req.body.email) {
    req.flash('error_msg', 'Please provide the account email')
    res.redirect('back')
    return
  }
  var user = await User.findOne({email: req.body.email})
  if (!user || !user._id) {
    req.flash('success_msg', 'An email has been sent to the member associated with this account.')
    res.redirect('back')
    return
  } else {

    const salt = await bcrypt.genSalt(10)
    const hash =  await bcrypt.hash(user._id.toString(), salt)

    const id_link = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+'/users/reset-change-password?key=' + hash + '&email=' + user.email
    const msg_text = 'Reset your password here: ' + id_link
    const msg_html = 'Reset your password here: <a href="' + id_link + '">' + id_link + '</a>'
    user.requested_reset = true
    await user.save()
    await sendEmail(user.email, req.body.email, 'Reset Your Password', msg_text, msg_html )
    // await sendEmail('eh@rafaelancheta.com', 'rafaelrancheta@gmail.com', 'Reset Your Password', msg_text, msg_html )

    req.flash('success_msg', 'An email has been sent to the member associated with this account.')
    res.redirect('back');
  }
});

router.post('/change-password', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.name) {
    res.render('error', {errorStatus: 404})
    return
  }
  if (!req.body || !req.body.old_password || !req.body.new_password || !req.body.confirm_new) {
    req.flash('error_msg', 'Please fill in all required fields')
    res.redirect('back')
    return
  }
  if(req.body.new_password.length < 4){
    req.flash('error_msg', 'Password must be at least 4 characters')
    res.redirect('back')
    return
  }
  if (req.body.new_password != req.body.confirm_new) {
    req.flash('error_msg', 'New password confirm does not match.')
    res.redirect('back')
    return
  }
  var user = await User.findOne({name: req.user.name})
  var passwordHash = user.password
  var isCorrectPassword = await bcrypt.compare(req.body.old_password, passwordHash)
  if (isCorrectPassword) {

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(req.body.new_password, salt, (err, hash) => {
        if(err) throw err;
        user.password = hash;
        user.save()
          .then(user => {
            req.flash('success_msg', 'Password Changed');
            res.redirect('back');
          })
          .catch(err => {
            console.log(err);
            return;
          });
      });
    });
  }
});

// Logout User
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router;

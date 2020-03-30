const express = require('express');
const path = require('path');
const exphbs  = require('express-handlebars');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');
var fileupload = require("express-fileupload");
require('./models/User');

const app = express();

// Load routes
const images = require('./routes/images');
const ideas = require('./routes/ideas');
const users = require('./routes/users');
const messages = require('./routes/messages');
const notifications = require('./routes/notifications');

// Passport Config
require('./config/passport')(passport);

// Map global promise - get rid of warning
mongoose.Promise = global.Promise;
// Connect to mongoose
mongoose.connect('mongodb://db-admin:CGiIRMipttwykPnp@cluster0-shard-00-00-esgtu.mongodb.net:27017,cluster0-shard-00-01-esgtu.mongodb.net:27017,cluster0-shard-00-02-esgtu.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true', {
})
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.log(err));

// Handlebars Middleware
var hbs = exphbs.create({
    defaultLayout: 'main',
    helpers: {
        eq: function (a, b, options) {
          if(a === b) {
            return options.fn(this);
          }
          return options.inverse(this);
        },
        match: function (a, b, options) {
          if(a.match(b)) {
            return options.fn(this);
          }
          return options.inverse(this);
        },
        noteq: function (a, b, options) {
          if(a !== b) {
            return options.fn(this);
          }
          return options.inverse(this);
        },
        truncate: function (a, b, options) {
          console.log(a,b)
          if(a && b){
            var truncated = a.substring(0,b);
            return truncated
          } else {
            return
          }
        },
    }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(fileupload());

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Method override middleware
app.use(methodOverride('_method'));

// Express session midleware
var redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
}
app.use(session({
    // store: new RedisStore(redisConfig),
    cookie: { maxAge: 60000 },
    secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Global variables
app.use(function(req, res, next){
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Index Route
app.get('/', (req, res) => {
  const title = 'Welcome';
  res.render('index', {
    title: title,
  });
});

// About Route
app.get('/about', (req, res) => {
  res.render('about');
});


// Use routes
app.use('/home', ideas);
app.use('/users', users);
app.use('/messages', messages);
app.use('/notifications', notifications);
app.use('/images', images);

const port = process.env.PORT || 5000;

const server = require('http').createServer(app);
const io = require('socket.io')(server);

server.listen(port, () =>{
  console.log(`Server started on port ${port}`);
});

require('./webchat-io.js')(io)

require( './config/config.js' );
require( './authentication' );

var express = require( 'express' );
var app = express();
var server = require( 'http' ).createServer( app );
var io = require( 'socket.io' );
io = io.listen( server );
var mongoose = require( 'mongoose' );
var mongodb = require( 'mongodb' );
var mongo = mongodb.MongoClient;
const cookieParser = require( 'cookie-parser' );
const passport = require( 'passport' );
const jwt = require( 'jsonwebtoken' );

var Post = require( './models/post.model' );
const User = require( './models/user' );
const authCheck = require( './middleware/auth-check' );

var url = process.env.MONGODB_URI;

mongoose.connect( url );

var db = mongoose.connection;
db.on( 'error', console.error.bind( console, 'connection error:' ) );
if ( !process.env.NODE_ENV === 'test' ) {
  db.once( 'open', function () {
    console.log( 'DB Connected' );
  } );
};

// Disable x-powered-by header which shows what software server is running (express);
app.disable( 'x-powered-by' );

app.use( require( './middleware/access-control-header' ) );

app.use( cookieParser() );
app.use( passport.initialize() );
app.use( passport.session() );

passport.serializeUser( ( user, done ) => {
  done( null, user );
} );
passport.deserializeUser( ( id, done ) => {
  done( null, id );
} );

// Temporary code to test login functionality
app.get( '/user', authCheck(), ( req, res ) => {
  const data = jwt.decode( req.cookies.token );
  User.findById( data._doc._id ).then( user => {
    res.status( 201 ).json( { username: user.username } );
  } ).catch( e => res.sendStatus( 400 ) );
} );
// END of temporary code.

// Middleware for routes
app.use( '/api/v1', require( './routes/api-v1' ) );
app.use( '/api/v2', require( './routes/api-v2' ) );

const authRoutes = require( './routes/auth' );
app.use( '/auth', authRoutes );

app.set( 'port', ( process.env.PORT || 3001 ) );
server.listen( app.get( 'port' ), function () {
  if ( !process.env.NODE_ENV === 'test' ) {
    console.log( 'Node app is running on port ', app.get( 'port' ) );
  }
} );

io.sockets.on( 'connection', socket => {
  console.log( 'client connected', socket.id );
  socket.on( 'post', data => {
    socket.broadcast.emit( 'post', { post: data } );
  } );
  socket.on( 'delete', data => {
    console.log( 'deleting: ', data );
    socket.broadcast.emit( 'delete', { delete: data } );
  } );
} );

module.exports = app;

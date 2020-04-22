var rfr = require('rfr');
var db = rfr('includes/models');
var ValidationError = rfr('includes/errors.js');
var api = rfr('includes/api.js');

exports.route = '/api/users';
exports.method = 'post';

exports.handler = function(req, res, next) {

	var body = req.body || {};

	var login = api.getParam(req, 'login', '');
	var type = api.getParam(req, 'type', 'default');
	var password = api.getParam(req, 'password', '');
	var email = api.getParam(req, 'email', '');

	var ip = api.getVisitorIp(req);

	var gotUser = null;

	db.User.removeOldDemoAccounts();

	db.User.register({
		login: login,
		type: type,
		password: password,
		email: email,
		ip: ip
	}).then(function(user) {
		gotUser = user;
		return user.auth();
	}).then(function(authentication) {
		res.setCookie('logged_in_user', authentication.auth_code, {
			path: '/',
			maxAge: 365 * 24 * 60 * 60
		});
		res.setCookie('is_logged_in_user', '1', {
			path: '/',
			maxAge: 365 * 24 * 60 * 60
		});

		res.send({
			id: gotUser.id,
			email: gotUser.email,
			login: gotUser.login,
			is_demo: gotUser.is_demo,
			auth_code: authentication.auth_code
		});

		next();
	}).catch(function(e) {
		throw e;
	});

	return true;
};
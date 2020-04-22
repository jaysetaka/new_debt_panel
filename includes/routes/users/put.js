var rfr = require('rfr');
var db = rfr('includes/models');
var errors = rfr('includes/errors.js');
var api = rfr('includes/api.js');

exports.route = '/api/users/:user_id';
exports.method = 'put';

exports.handler = function(req, res, next) {

	var user_id = req.params.user_id;

	var password = api.getParam(req, 'login', null);
	var email = api.getParam(req, 'email', null);
	var login = api.getParam(req, 'login', null);

	var current_password = api.getParam(req, 'current_password', null);
	
	var ip = api.getVisitorIp(req);

	api.requireSignedIn(req, function(user) {

		var promise = false;
		if (user.is_demo)
			promise = user.fillProfile({
				email: email,
				login: login,
				password: password,
				ip: ip
			});
		else
			promise = user.update({
				password: password,
				current_password: current_password
			});

		if (promise === false)
			throw new errors.HaveNoRightsError();

		promise.then(function(user) {
			res.send({
				login: user.login,
				email: user.email,
				id: user.id,
				is_demo: user.is_demo
			});
			next();
		});

	});

};
var rfr = require('rfr');
var db = rfr('includes/models');
var errors = rfr('includes/errors.js');
var api = rfr('includes/api.js');

exports.route = '/api/wallets/:wallet_id/plans';
exports.method = 'get';

exports.handler = function(req, res, next) {

	var wallet_id = parseInt(req.params.wallet_id || 0, 10);

	api.requireSignedIn(req, function(user) {
		db.Wallet.findOne({
				where: {
					id: wallet_id,
					user_id: user.id
				}
			})
			.then(function(wallet) {
				if (!wallet) throw new errors.HaveNoRightsError();
				return wallet.getWalletPlans();
			})
			.then(function(plans) {
				var resPlans = [];
				for (var k in plans)
					resPlans.push(plans[k].checkIfFinished());

				db.sequelize.Promise.all(resPlans).then(function() {
					res.send(plans);
					next();
				});
			});
	});

};
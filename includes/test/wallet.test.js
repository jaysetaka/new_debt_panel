var hippie = require('hippie');
var rfr = require('rfr');
var expect = require('chai').expect;
var assert = require('chai').assert;
var testHelper = rfr('includes/test.js');
var db = rfr('includes/models');

describe('API server', function() {

	/// Data for user registration
	var email = 'email' + Math.random() + '@example.com';
	var login = 'login' + Math.random();
	var password = 'password' + Math.random();
	var registeredUserId = null;
	var auth_code = null;

	var wallet_1_name = 'name ' + Math.random();
	var wallet_1_currency = 'USD';
	var wallet_1_id = null;
	var wallet_1_initial_amount = 200.99;

	it('registers user', function(done) {
		testHelper.sendPost('/api/users', {
			email: email,
			login: login,
			password: password
		}).then(function(data) {
			expect(data.body.id).to.be.a('number');
			expect(data.body.email).to.be.a('string');
			expect(data.body.email).to.equal(email);
			expect(data.body.login).to.be.a('string');
			expect(data.body.login).to.equal(login);
			expect(data.body.auth_code).to.be.a('string');

			expect(data.cookies.is_logged_in_user).to.be.ok;
			expect(data.cookies.logged_in_user).to.equal(data.body.auth_code);

			registeredUserId = data.body.id;
			auth_code = data.body.auth_code;

			done();
		});
	});

	it('signs him in on registration', function(done) {
		testHelper.sendGet('/api/users').then(function(data) {
			expect(data.body.id).to.be.a('number');
			expect(data.body.id).to.equal(registeredUserId);
			done();
		});
	});

	it('returns empty wallets list for new (not demo) user', function(done) {
		testHelper.sendGet('/api/wallets').then(function(data) {
			expect(data.body).to.be.a('array');
			expect(data.body).to.have.length(0);
			done();
		});
	});

	it('allows him to sign out', function(done) {
		testHelper.sendPost('/api/users/signout', null).then(function(data) {
			done();
		});
	});

	it('does not allow to remove account for signed out user', function(done) {
		testHelper.sendGetAndExpectStatus('/api/users/' + registeredUserId + '/removeaccount', "!200").then(function() {
			done();
		});
	});

	it('does not show signed out user info', function(done) {
		testHelper.sendGetAndExpectStatus('/api/users', 500).then(function() {
			done();
		});
	});

	it('allows him to sign in', function(done) {
		testHelper.sendPost('/api/users/signin', {
			username: login,
			password: password
		}).then(function(data) {
			expect(data.cookies.is_logged_in_user).to.be.ok;
			expect(data.cookies.logged_in_user).to.equal(data.body.auth_code);
			expect(data.body.id).to.equal(registeredUserId);

			auth_code = data.body.auth_code;

			done();
		});
	});

	it('allows to confirm that user is signed in', function(done) {
		testHelper.sendGet('/api/users').then(function(data) {
			expect(data.body.id).to.be.a('number');
			expect(data.body.id).to.equal(registeredUserId);
			done();
		});
	});

	it('adds new wallet', function(done) {
		testHelper.sendPost('/api/wallets', {
			name: wallet_1_name,
			currency: wallet_1_currency
		}).then(function(data) {
			expect(data.body.user_id).to.equal(registeredUserId);
			expect(data.body.name).to.equal(wallet_1_name);
			expect(data.body.total).to.equal(0);
			expect(data.body.status).to.equal('active');
			expect(data.body.currency).to.equal(wallet_1_currency);

			wallet_1_id = data.body.id;
			done();
		});
	});

	it('returns updated wallets list', function(done) {
		testHelper.sendGet('/api/wallets').then(function(data) {
			expect(data.body).to.be.a('array');
			expect(data.body).to.have.length(1);
			expect(data.body[0].id).to.equal(wallet_1_id);
			expect(data.body[0].name).to.equal(wallet_1_name);
			expect(data.body[0].status).to.equal('active');
			expect(data.body[0].origin).to.equal('mine');
			expect(data.body[0].currency).to.equal(wallet_1_currency);

			done();
		});
	});

	it('lets us edit wallet name and currency', function(done) {
		wallet_1_name = wallet_1_name + '_updated';
		wallet_1_currency = 'EUR';
		testHelper.sendPut('/api/wallets/' + wallet_1_id, {
			name: wallet_1_name,
			currency: wallet_1_currency
		}).then(function(data) {
			expect(data.body.name).to.equal(wallet_1_name);
			expect(data.body.currency).to.equal(wallet_1_currency);
			done();
		});
	});

	it('lets us add some income transaction to wallet', function(done) {
		testHelper.sendPost('/api/wallets/' + wallet_1_id + '/transactions/', {
			wallet_id: wallet_1_id,
			amount: wallet_1_initial_amount,
			description: 'Initial'
		}).then(function(data) {
			expect(data.body).to.be.a('object');
			expect(data.body.amount).to.equal(wallet_1_initial_amount);
			expect(data.body.wallet_id).to.equal(wallet_1_id);
			expect(data.body.user_id).to.equal(registeredUserId);
			expect(data.body.description).to.equal('Initial');

			done();
		});
	});

	it('updates wallet total with transactions', function(done) {
		testHelper.sendGet('/api/wallets/' + wallet_1_id).then(function(data) {
			expect(data.body).to.be.a('object');
			expect(data.body.total).to.equal(wallet_1_initial_amount);
			done();
		});
	});

	// wallet_1_initial_amount = 200.99
	var testTransactions = [];
	testTransactions.push({
		amount: -0.99,
		shouldSetTotalTo: wallet_1_initial_amount - 0.99, // 200
		whenRemovedShouldSetTotalTo: 900
	});
	testTransactions.push({
		amount: -100,
		shouldSetTotalTo: wallet_1_initial_amount - 0.99 - 100, // 100
		whenRemovedShouldSetTotalTo: 900
	});
	testTransactions.push({
		subtype: 'setup',
		amount: 201, /// setup amount is +101.00
		shouldSetTotalTo: 201, //// setup transaction set wallet total to its amount,
		whenRemovedShouldSetTotalTo: 900
	});
	testTransactions.push({
		amount: 99,
		shouldSetTotalTo: 300,
		whenRemovedShouldSetTotalTo: 900
	});
	testTransactions.push({
		subtype: 'setup',
		amount: 1000, /// setup amount is +700.00
		shouldSetTotalTo: 1000,
		whenRemovedShouldSetTotalTo: 100.99 //// initial - last
	});
	testTransactions.push({
		amount: -100,
		shouldSetTotalTo: 900,
		whenRemovedShouldSetTotalTo: 200.99 /// initial
	});

	testTransactions.forEach(function(testTransaction, index, array) {
		it('lets us add another sample transaction', function(done) {
			var data = {
				wallet_id: wallet_1_id,
				amount: testTransaction.amount,
				description: 'fasd'
			};
			if (typeof(testTransaction.subtype) !== 'undefined')
				data.subtype = testTransaction.subtype;

			testHelper.sendPost('/api/wallets/' + wallet_1_id + '/transactions/', data).then(function(data) {
				expect(data.body).to.be.a('object');
				if (data.body.subtype === 'confirmed')
					expect(data.body.amount).to.equal(testTransaction.amount);

				array[index]['id'] = data.body.id;
				done();
			});
		});

		it('updates wallet total with sample transactions', function(done) {
			testHelper.sendGet('/api/wallets/' + wallet_1_id).then(function(data) {
				expect(data.body).to.be.a('object');
				expect(data.body.total).to.equal(testTransaction.shouldSetTotalTo);
				done();
			});
		});
	});

	it('should allow to check that all transactions added', function(done) {
		testHelper.sendGet('/api/wallets/' + wallet_1_id + '/transactions/').then(function(data) {
			expect(data.body).to.be.a('array');
			var somethingIsNotFound = false;
			testTransactions.forEach(function(testTransaction) {
				var found = false;
				for (var k in data.body)
					if (data.body[k].id == testTransaction.id)
						found = true;

				if (!found)
					somethingIsNotFound = true;
			});
			expect(somethingIsNotFound).to.equal(false);

			done();
		});
	});

	testTransactions.forEach(function(testTransaction) {
		it('should let us remove transaction', function(done) {
			testHelper.sendDelete('/api/wallets/' + wallet_1_id + '/transactions/' + testTransaction.id).then(function(data) {
				expect(data.body).to.equal(true);
				done();
			});
		});
		it('should allow to double check that transaction is removed', function(done) {
			testHelper.sendGet('/api/wallets/' + wallet_1_id + '/transactions').then(function(data) {
				expect(data.body).to.be.a('array');
				var found = false;
				for (var k in data.body)
					if (data.body[k].id == testTransaction.id)
						found = true;
				expect(found).to.equal(false);

				done();
			});
		});
		it('updates wallet total when transaction is removed', function(done) {
			testHelper.sendGet('/api/wallets/' + wallet_1_id).then(function(data) {
				expect(data.body).to.be.a('object');
				expect(+parseFloat(data.body.total).toFixed(2)).to.equal(testTransaction.whenRemovedShouldSetTotalTo);
				done();
			});
		});
	});

	it('does not allow to remove wallet instantly', function(done) {
		testHelper.sendDeleteAndExpectStatus('/api/wallets/' + wallet_1_id, '!200').then(function(data) {
			done();
		});
	});

	it('hides wallet with PUT method', function(done) {
		testHelper.sendPut('/api/wallets/' + wallet_1_id, {
			status: 'hidden'
		}).then(function(data) {
			expect(data.body.status).to.equal('hidden');
			done();
		});
	});

	it('allow to remove hidden wallet', function(done) {
		testHelper.sendDelete('/api/wallets/' + wallet_1_id).then(function(data) {
			expect(data.body).to.equal(true);
			done();
		});
	});

	it('returns empty wallets list now, as we have removed the only wallet', function(done) {
		testHelper.sendGet('/api/wallets').then(function(data) {
			expect(data.body).to.be.a('array');
			expect(data.body).to.have.length(0);
			done();
		});
	});

	var remove_account_code = null;

	it('allow to initialize remove account procedure for signed in user', function(done) {
		testHelper.sendPostAndExpectStatus('/api/users/' + registeredUserId + '/removeaccount', {}, '200').then(function(data) {
			expect(data.body).to.equal(true);

			db.User.findOne({
				where: {
					id: registeredUserId
				}
			}).then(function(user) {

				expect(registeredUserId).to.equal(user.id);
				remove_account_code = user.remove_account_code;

				done();
			});
		});
	});

	it('does not allow to finish account remove procedure with wrong remove_account_code', function(done) {
		testHelper.sendPostAndExpectStatus('/api/users/' + registeredUserId + '/removeaccount', {
			code: 'wrong'
		}, '200').then(function(data) {
			expect(data.body).to.equal(false);
			done();
		});
	});

	it('does not allow to finish account remove procedure with good remove_account_code, but wrong user_id parameter', function(done) {
		testHelper.sendPostAndExpectStatus('/api/users/' + registeredUserId - 2 + '/removeaccount', {
			code: remove_account_code
		}, '!200').then(function(data) {
			done();
		});
	});

	it('allow to finish remove account procedure', function(done) {
		testHelper.sendPostAndExpectStatus('/api/users/' + registeredUserId + '/removeaccount', {
			code: remove_account_code
		}, '200').then(function(data) {
			expect(data.body).to.equal(true);

			/// double check that user is removed
			db.User.findOne({
				where: {
					id: registeredUserId
				}
			}).then(function(user) {
				expect(user).to.equal(null);
				done();
			});
		});
	});

});
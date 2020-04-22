// add_wallet.js
App.Views.Dialogs.AddWallet = App.Views.Abstract.Dialog.extend({

	dialogName: 'add_wallet',
	events: {
		"submit form": "onSubmit"
	},
	focusOnInit: '#input_name',
	initialize: function() {
		this.show();
	},
	onSubmit: function() {
		var that = this;

		this.$('.btn-primary').button('loading');
		var name = this.$('#input_name').val();
		var currency = this.$('#input_currency').val();
		var error = '';

		if (!currency)
			error = 'Please select wallet currency';

		if (error) {
			this.$('.errors-container').html(error);
			this.$('.errors-container').slideDown();

			this.$('#input_currency').focus();
			this.$('.btn-primary').button('reset');
			var that = this;
			setTimeout(function() {
				that.$('.errors-container').slideUp();
			}, 2000);
		} else {
			var item = new App.Models.Wallet();
			item.set('name', name);
			item.set('currency', currency);
			item.set('total', 0);
			item.set('status', 'active');

			if (typeof(App.page) !== 'undefined' && App.page && typeof(App.page.items) !== 'undefined' && App.page.items.model == App.Models.Wallet) {
				App.page.items.add(item);
			}

			item.save();

			this.hide();
		}

		return false;
	}
});
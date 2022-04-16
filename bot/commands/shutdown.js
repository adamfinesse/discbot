const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('shutdown')
		.setDescription('This shuts down the bot.'),
	async execute(interaction) {
		client.destroy();
	},
};
const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('shutdown')
		.setDescription('This shuts down the bot.'),
	async execute(interaction) {
	//await interaction.reply(`Bot successfully shutdown`);
	await interaction.client.destroy(); // interaction.client used to grab client instance.
	},
};
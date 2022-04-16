const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('shutdown')
		.setDescription('This shuts down the bot.'),
	async execute(interaction) {
	await interaction.reply(`Server name: ${interaction.guild.name}\n Bot successfully shutdown`);
    process.exit();
		//client.destroy();
	},
};
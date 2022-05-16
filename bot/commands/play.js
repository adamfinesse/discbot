const { SlashCommandBuilder } = require('@discordjs/builders');
const {google} = require('googleapis');
const {googleAPI} = require("../config.json");
const fetch = require("node-fetch");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('plays a song off youtube')
        .addStringOption(searchTerm =>
            searchTerm.setName("input")
                .setDescription("the search term to search for on youtube.")
                .setRequired(true)
        ),
    async execute(interaction) {
        const args = (interaction.options.getString("input")).split(" ");

        let endpoint = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${args.join("%20")}&key=${googleAPI}`;
        let request = await fetch(endpoint);
        let json = await request.json();

        console.log(json["items"][0]["id"].videoId);


    },
};
const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require('node-fetch');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const {googleAPI,SE} = require("../config.json");
let limit =0;
let embedArray =[];
let start =0;
let currentIndex =0;
let input = "emptyString";
let currentPage =0;
let numResults =5;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('google')
		.setDescription('enter search terms to receive a list of results.')
		.addStringOption(searchTerm =>
		    searchTerm.setName("input")
		    .setDescription("the search term to search for.")
		    .setRequired(true)
		    ),
	async execute(interaction) {
		// only 100 total uses in a day, so we block off more than 100 attempts.
		if(limit>=99) return interaction.reply("There were over 99 search attempts today! Please retry tomorrow.");

		//get the arguments from the command
         const args = (interaction.options.getString("input")).split(" ");

        //retrieve the response and parse the json for the links + snippet description
            input = interaction.options.getString("input");
            let json = await searchGoogle(args, start, 0);
            start = start + 5;
            let urls = extractInfo(json);

        //finally send the urls we gathered to the channel via embed.
           let searchEmbed = embedBuilder(urls,interaction.options.getString("input"));
           embedArray.push(searchEmbed);

           const row = new MessageActionRow()
           			.addComponents(
           				new MessageButton()
           					.setCustomId('prev')
           					.setLabel('previous page')
           					.setStyle('PRIMARY'),

           				new MessageButton()
           				    .setCustomId('next')
           				    .setLabel('next page')
           				    .setStyle('PRIMARY')
           			);

           await interaction.reply({embeds: [searchEmbed], fetchReply: true, components: [row]});

           interaction.client.on('interactionCreate', async interaction => {
           	if (!interaction.isButton()) return;

           	if(interaction.customId == "next"){
           	//console.log("inside next");

                if(embedArray[currentIndex+1] !== undefined){
                    //console.log("returned inside next");
                    //console.log(typeof embedArray[currentIndex]);
                    await interaction.update({embeds: [embedArray[currentIndex]]});
                    currentIndex++;
                }else{
                    let json = await searchGoogle(args, start, 0 );
                    start = start + 5;
                    let urls = extractInfo(json);

                    let searchEmbed2 = embedBuilder(urls,input);
                    embedArray.push(searchEmbed2);
                    currentIndex++;

                    await interaction.update({embeds: [searchEmbed2]});
                }
           	}

           	else if(interaction.customId == "prev"){
                if(currentIndex==0) return;
                currentIndex--;
                await interaction.update({embeds: [embedArray[currentIndex]]});

           	}
           	else{
           	    return;
           	}
        });
	},
};

function extractInfo(json){
       let urlArr = [];
        json["items"].forEach(url => {
            let urlObj = { "url": url["link"],
            "snippet": url["snippet"].slice(0,url["snippet"].length-2)
        };
        urlArr.push(urlObj);
        });
        return urlArr;
}

function embedBuilder(urls, searchTerms){
    let resultEmbed = new MessageEmbed()
        .setColor("#4287f5")
        .setTitle('Search Results for '+searchTerms)
        .setTimestamp()
        .setFooter({text: "Page " + currentPage});
        currentPage++;
        urls.forEach(obj => {
            resultEmbed.addField( obj["url"],obj["snippet"],false);
        });
        return resultEmbed;
}

async function searchGoogle(args, start, end){
    //sets up the search end point with our search term(s) and makes the request
    //if(numResults > 10) numResults = 5;
    let endpoint = `https://www.googleapis.com/customsearch/v1?key=${googleAPI}&cx=${SE}&q=${args.join('+')}&start=${start}&num=${numResults}`;
    let request = await fetch(endpoint);
    limit++;
    //numResults = numResults + 5;
    //if failure let the user know
    if(!request.ok) {
        return interaction.reply('There was an error with your request. Error code: ' + request.status);
    }
    let json = request.json();

    return json;
}
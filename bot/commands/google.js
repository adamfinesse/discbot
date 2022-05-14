const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');
const {googleAPI,SE} = require("../config.json");
let limit =0;
let embedArray =[];
let start =1;
let currentIndex =0;
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

            let json = await searchGoogle(args, start, 0);
            start = start + 10;
            let urls = extractInfo(json);

        //finally send the urls we gathered to the channel via embed.
           let searchEmbed = embedBuilder(urls,interaction.options.getString("input"));
           embedArray.push(searchEmbed);
           let message = await interaction.reply({embeds: [searchEmbed], fetchReply: true});

           //await message.react("⬅️").then(() => message.react("➡️"));
           await message.react("⬅️");
           await message.react("➡️");

          //console.log(message);

         //now wait for a left arrow or right arrow to view more pages of search results.
           const filter = (reaction, user) => {
           console.log("filter ran");
           	return ["⬅️", "➡️"].includes(reaction.emoji.name) && user.id === interaction.user.id;
           };

           message.awaitReactions({ filter, max: 1, time: 20000, errors: ['time'] })
           	.then(async collected => {
           		let reaction = collected.first();

           		if (reaction.emoji.name === "⬅️") {
           			console.log('You reacted with a left arrow.');
           			//here use previous results and redisplay the old embed (save an array of previous embeds) and either clear or resend reactions
                    message.edit({embeds: [embedArray[currentIndex]]});
                    currentIndex--;
                    // likely want to change this all around to a button instead for repeated actions.


           		} else if(reaction.emoji.name === "➡️") {
           			console.log('You reacted with a right arrow.');
           			//need to add checks if we already searched before for
           			if(currentIndex <= embedArray.length-1 && embedArray.length !=1){// or check if current index is not larger then length
           			message.edit({embeds: [embedArray[currentIndex]]});
                    currentIndex++;
           			}else{
                        let json = await searchGoogle(args, start, 0 );
                        let urls = extractInfo(json);
                        let searchEmbed2 = embedBuilder(urls,interaction.options.getString("input"));
                        embedArray.push(searchEmbed);
                        currentIndex++;
                        message.edit({embeds: [searchEmbed2]});
                    }
           		}
           	})
           	.catch(collected => {
           	     //if after the time is up clear everything and let the user know they will need to make a new search to use arrow features
           	    //console.log(collected);
           		message.reply('You reacted with neither a left or right arrow.');
           	});

	},
};

function extractInfo(json){
       let urlArr = [];
        json["items"].forEach(url => {
            let urlObj = { "url": url["link"],
            "snippet": url["snippet"]
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

        urls.forEach(obj => {
            resultEmbed.addField( obj["url"],obj["snippet"],false);
        });
        return resultEmbed;
}

async function searchGoogle(args, start, end){
    //sets up the search end point with our search term(s) and makes the request
    let endpoint = `https://www.googleapis.com/customsearch/v1?key=${googleAPI}&cx=${SE}&q=${args.join('+')}&start=${start}`;
    let request = await fetch(endpoint);
    limit++;

    //if failure let the user know
    if(!request.ok) {
        return interaction.reply('There was an error with your request. Error code: ' + request.status);
    }
    let json = request.json();

    return json;
}
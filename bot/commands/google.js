const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require('node-fetch');
const jsdom = require("jsdom");


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
		//get the arguments from the command
         const args = (interaction.options.getString("input")).split(" ");
         console.log(args);

        let response = await fetch('https://www.google.com/search?q=' + args.join('+'));

        if(!response.ok) {
            return interaction.reply('There was an error with your request. Error code: ' + response.status);
        }

        else{
//            let json = await response.json();
//            await console.log(json);
            let html = await response.text();
            //let links = html.match(/<a href='(.*?)'/g)//


//            const fs = require('node:fs');
//            var util = require('util');
//            fs.writeFileSync('test.txt', html);


            const { JSDOM } = jsdom;
            let dom = new JSDOM(html);
            const {document: doc} = dom.window;
            let links = doc.getElementsByTagName('a');
           // console.log(links[3].getAttribute('href'));
            var urls = [];

            for (var i=0; i<links.length-22; i++) {
                if(links[i].getAttribute("href").includes('/url?q=https') && !links[i].getAttribute("href").includes('youtube')){
                urls.push(links[i].getAttribute("href").substring(7,links[i].getAttribute("href").length));//-86
            }
            //let links = html.match(/<a href="url?=https:"/g);
//            let finalLinks = [];//(.*?)
//            let c =0;
//           links.forEach(link => {
//            if(link.includes('/url?q=https')){
//                //links.splice(c, 1);
//                finalLinks.push(link);
       }
//            c++;
//            });
            console.log(urls);
            let botMessage = '';
            urls.forEach(link => {
                botMessage += link + '\n';
            });
            //let text = await response.text().then(text => console.log(text));
            await interaction.reply(botMessage);
        }
	},
};
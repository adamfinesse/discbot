const { SlashCommandBuilder } = require('@discordjs/builders');
const {google} = require('googleapis');
const {googleAPI} = require("../config.json");
const fetch = require("node-fetch");
const {MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");
const { createAudioPlayer, createAudioResource , StreamType, demuxProbe, joinVoiceChannel, NoSubscriberBehavior, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection,
    AudioPlayerIdleState,
    AudioPlayerPlayingState
} = require('@discordjs/voice')
const play = require('play-dl')
const { unescape }= require("html-escaper");
let songQueue = [];
let urlArr =[]
let eventBool = false;
let currentSong;
let connection;
module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('options for music bot')
        .addSubcommand(youtube =>
        youtube.setName("youtube")
            .setDescription("plays a song off youtube.")
            .addStringOption(searchTerm =>
                searchTerm.setName("input")
                    .setDescription("the search term to search for on youtube.")
                    .setRequired(true)))
        .addSubcommand(stop =>
        stop.setName("stop")
            .setDescription("stops the bot from playing music."))
        .addSubcommand(pause =>
        pause.setName("pause")
            .setDescription("pauses the music bot."))
        .addSubcommand(resume =>
            resume.setName("resume")
                .setDescription("resumes the music bot."))
        .addSubcommand(queue =>
            queue.setName("queue")
                .setDescription("shows the queue of the music bot."))
        .addSubcommand(skip =>
        skip.setName("skip")
            .setDescription("skips the current song."))
        .addSubcommand(soundcloud =>
                soundcloud.setName("soundcloud")
                    .setDescription("shows the queue of the music bot.")
                    .addStringOption(searchTerm =>
                        searchTerm.setName("input")
                            .setDescription("the search term to search for on soundcloud.")
                            .setRequired(true))),
    async execute(interaction) {
        if (!interaction.member.voice?.channel) return interaction.reply('Connect to a Voice Channel');
        // if (interaction.client.players.has(interaction.guildId)) {
        //
        // }

        switch(interaction.options.getSubcommand()) {
            case "youtube":
                const origArgs = interaction.options.getString("input");
                const args = (interaction.options.getString("input")).split(" ");

                if (origArgs.includes("https://www.youtube.com/watch")) {
                    if (interaction.client.players.has(interaction.guildId)) {
                        let player = interaction.client.players.get(interaction.guildId);

                        let endpoint = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${args.join("%20")}&key=${googleAPI}`;
                        let request = await fetch(endpoint);
                        let json = await request.json();
                        let itemsArr = json["items"];

                        if (player.state.status == AudioPlayerStatus.Playing) {
                            songQueue.push({url: origArgs, title: unescape(itemsArr[0]["snippet"]["title"]), description: itemsArr[0]["snippet"]["description"], thumbnail: itemsArr[0]["snippet"]["thumbnails"]["default"]["url"], channel: unescape(itemsArr[0]["snippet"]["channelTitle"]) });
                            //console.log(songQueue[0])
                            let addedToQueueEmbed = new MessageEmbed()
                                .setColor("#FF0000")
                                .setTitle("Added to queue: " + unescape(itemsArr[0]["snippet"]["title"]))
                                .setThumbnail(itemsArr[0]["snippet"]["thumbnails"]["default"]["url"])
                                //.setDescription("")
                                .setTimestamp()
                            interaction.reply({embeds: [addedToQueueEmbed], fetchReply: true})

                        } else {
                            let song = {url: origArgs, title: itemsArr[0]["snippet"]["title"], description: itemsArr[0]["snippet"]["description"], thumbnail: itemsArr[0]["snippet"]["thumbnails"]["default"]["url"], channel: unescape(itemsArr[0]["snippet"]["channelTitle"] )}
                            songQueue.push(song);

                            await playSong(interaction,player);
                            let playingEmbed = new MessageEmbed()
                                .setColor("#FF0000")
                                .setTitle("Now playing: " + unescape(song.title))
                                .setThumbnail(song.thumbnail)
                                //.setDescription("")
                                .setTimestamp()
                            interaction.reply({embeds: [playingEmbed], fetchReply: true});

                            if (eventBool == false) {
                                //player.on(AudioPlayerStatus.Idle,nextSongEvent);
                                player.on(AudioPlayerStatus.Idle, async () => {
                                    eventBool = true;
                                    if (songQueue.length == 0) {
                                        interaction.channel.send("Queue finished!");
                                        player.stop();
                                        connection.unsubscribe(player);
                                        return;
                                    }

                                    let song = songQueue.shift();

                                    if(song.url.includes("soundcloud")){
                                        let stream = await playSongSC(interaction,player,song);
                                    }

                                    let stream = await play.stream(song.url)

                                    //Create AudioResource from Stream
                                    let resource = createAudioResource(stream.stream, {
                                        inputType: stream.type
                                    })

                                    player.play(resource)

                                    let playingEmbed = new MessageEmbed()
                                        .setColor("#FF0000")
                                        .setTitle("Now playing: " + unescape(song.title))
                                        .setThumbnail(song.thumbnail)
                                        //.setDescription("")
                                        .setTimestamp()
                                    interaction.channel.send({embeds: [playingEmbed], fetchReply: true})
                                });
                            }
                        }
                    }

                } else {
                    let endpoint = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${args.join("%20")}&key=${googleAPI}`;
                    let request = await fetch(endpoint);
                    let json = await request.json();
                    let itemsArr = json["items"];


                    let searchEmbed = new MessageEmbed()
                        .setColor("#FF0000")
                        .setTitle("YT Results for " + origArgs)
                        .setDescription("Reply with 1-5 to select video.")
                        .setTimestamp()

                    let c = 1;
                    itemsArr.forEach(url => {
                        let YTurl = "https://www.youtube.com/watch?v=" + url["id"].videoId;
                        let titleString = unescape(url["snippet"]["title"])
                        searchEmbed.addField(c + `: ${YTurl}`, titleString, false);
                        urlArr[c] = {url: YTurl, title: titleString, description: url["snippet"]["description"], thumbnail: url["snippet"]["thumbnails"]["default"]["url"], channel: unescape(url["snippet"]["channelTitle"]) };
                        c++;
                    });

                    let int = 0;
                    const filter = response => {
                        console.log("filter ran");
                        int = parseInt(response.content);
                        return (int > 0 && int <= 5);
                    };

                    await interaction.reply({embeds: [searchEmbed], fetchReply: true})
                        .then(() => {
                            interaction.channel.awaitMessages({filter, max: 1, time: 30000, errors: ['time']})
                                .then(async collected => {
                                    //if (interaction.client.players.has(interaction.guildId)) {
                                        let player = interaction.client.players.get(interaction.guildId);
                                        if (player.state.status == AudioPlayerStatus.Playing) {
                                            songQueue.push(urlArr[int]);
                                            let addedToQueueEmbed = new MessageEmbed()
                                                .setColor("#FF0000")
                                                .setTitle("Added to queue: " + urlArr[int].title)
                                                .setThumbnail(urlArr[int].thumbnail)
                                                //.setDescription("")
                                                .setTimestamp()
                                            interaction.channel.send({embeds: [addedToQueueEmbed], fetchReply: true})
                                        } else {
                                            let song = urlArr[int];
                                            songQueue.push(song);

                                            await playSong(interaction,player);

                                            let playingEmbed = new MessageEmbed()
                                                .setColor("#FF0000")
                                                .setTitle("Now playing: " + unescape(song.title))
                                                .setThumbnail(song.thumbnail)
                                                //.setDescription("")
                                                .setTimestamp()
                                            interaction.channel.send({embeds: [playingEmbed], fetchReply: true});

                                            if (eventBool == false) {
                                                //player.on(AudioPlayerStatus.Idle, nextSongEvent);
                                                player.on(AudioPlayerStatus.Idle, async () => {
                                                    eventBool = true;
                                                    if (songQueue.length == 0) {
                                                        interaction.channel.send("Queue finished!");
                                                        player.stop();
                                                        connection.unsubscribe(player);
                                                        return;
                                                    }
                                                    let song = songQueue.shift();
                                                    let stream = await play.stream(song.url)

                                                    //Create AudioResource from Stream
                                                    let resource = createAudioResource(stream.stream, {
                                                        inputType: stream.type
                                                    })

                                                    player.play(resource)

                                                    let playingEmbed = new MessageEmbed()
                                                        .setColor("#FF0000")
                                                        .setTitle("Now playing: " + unescape(song.title))
                                                        .setThumbnail(song.thumbnail)
                                                        //.setDescription("")
                                                        .setTimestamp()
                                                    interaction.channel.send({embeds: [playingEmbed], fetchReply: true})
                                                });
                                            }
                                        }
                                    //}
                                })
                                .catch(collected => {
                                    console.log(collected)
                                    interaction.followUp('Looks like nobody sent a number 1-5, Retry command to play a song');
                                });
                        });
                }
                break;
            case "skip":
                if (interaction.client.players.has(interaction.guildId)) {
                    let player = interaction.client.players.get(interaction.guildId);
                    if (songQueue.length == 0) {
                        await interaction.reply("There are 0 songs left in the queue. You cant skip at the moment.");
                    } else {

                        if (player.state.status == AudioPlayerStatus.Playing) {
                            let song = songQueue.shift();
                            let stream = await play.stream(song.url)

                            //Create AudioResource from Stream
                            let resource = createAudioResource(stream.stream, {
                                inputType: stream.type
                            })

                            player.play(resource)
                            let playingEmbed = new MessageEmbed()
                                .setColor("#FF0000")
                                .setTitle("Song Skipped! Now playing: " + song.title)
                                .setThumbnail(song.thumbnail)
                                //.setDescription("")
                                .setTimestamp()
                            interaction.reply({embeds: [playingEmbed], fetchReply: true})
                        }
                    }
                }

                break;
            case "pause":
                if (interaction.client.players.has(interaction.guildId)) {
                    let player = interaction.client.players.get(interaction.guildId);
                        if (player.state.status == AudioPlayerStatus.Playing) {
                            player.pause();
                            let pauseEmbed = new MessageEmbed()
                                .setTitle("Player paused! Use /music resume to continue playing.")
                                .setColor("#FF0000")
                                .setTimestamp()
                            interaction.reply({embeds: [pauseEmbed], fetchReply: true})
                        }
                        else{
                            let notPlayingEmbed = new MessageEmbed()
                                .setTitle("The bot is not playing! Try another  command.")
                                .setColor("#FF0000")
                                .setTimestamp()
                            interaction.reply({embeds: [notPlayingEmbed], fetchReply: true})
                        }
                }
                break;

            case "stop":
                if (interaction.client.players.has(interaction.guildId)) {

                    let player = interaction.client.players.get(interaction.guildId);
                    if (player.state.status == AudioPlayerStatus.Playing) {
                        player.stop();
                        connection.unsubscribe(player);
                        let stopEmbed = new MessageEmbed()
                            .setTitle("Player Stopped!")
                            .setColor("#FF0000")
                            .setTimestamp()
                        interaction.reply({embeds: [stopEmbed], fetchReply: true})

                        // add logic at the top to check if there is a player in this discord, then if not make a new one
                        // in this method add a check if there is one, and remove it.
                    }
                    else{
                        let stopEmbed = new MessageEmbed()
                            .setTitle("Player is not playing!")
                            .setColor("#FF0000")
                            .setTimestamp()
                        interaction.reply({embeds: [stopEmbed], fetchReply: true})
                    }
                }
                break;
            case "resume":
                if (interaction.client.players.has(interaction.guildId)) {
                    let player = interaction.client.players.get(interaction.guildId);
                        if (player.state.status == AudioPlayerStatus.Paused) {
                            player.unpause();
                            let unpauseEmbed = new MessageEmbed()
                                .setTitle("Player unpaused! Use /music pause to pause playing.")
                                .setColor("#FF0000")
                                .setTimestamp()
                            interaction.reply({embeds: [unpauseEmbed], fetchReply: true})
                        }
                        else{
                            let playingEmbed = new MessageEmbed()
                                .setColor("#FF0000")
                                .setTitle("The bot is not paused! Try another  command.")
                                .setTimestamp()
                            interaction.reply({embeds: [playingEmbed], fetchReply: true})
                        }
                }
                break;
            case "queue":
                if(songQueue.length==0){
                let queueEmbed = new MessageEmbed()
                    .setTitle("The queues length is 0.")
                    .setTimestamp()
                    interaction.reply({embeds: [queueEmbed]})
                }
                else{
                    let pos =5;
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
                    let queueEmbed = new MessageEmbed()
                        .setTitle("Queue")
                        .setColor("#FF0000")
                    // need to add logic to accurately go through queue through length, 5 per embed
                    for(let i=0; i<pos;i++){
                        queueEmbed.addField(songQueue[i].title,songQueue[i].url,false)
                    }

                    await interaction.reply({embeds: [queueEmbed], fetchReply: true, components: [row]})

                    interaction.client.on('interactionCreate', async interaction => {
                        if (!interaction.isButton()) return;

                        if (interaction.customId == "next") {

                        }
                    });
                }
                break;
            case "soundcloud":

                break;
        }
    },
}
// async function nextSongEvent(interaction,player) {
//     eventBool = true;
//     if (songQueue.length == 0 && player.state.status == AudioPlayerStatus.Idle) {
//         interaction.channel.send("Queue finished!");
//         player.stop();
//         return;
//     }
//     let song = songQueue.shift();
//     let stream = await play.stream(song.url)
//
//     //Create AudioResource from Stream
//     let resource = createAudioResource(stream.stream, {
//         inputType: stream.type
//     })
//
//     player.play(resource)
//
//     let playingEmbed = new MessageEmbed()
//         .setColor("#FF0000")
//         .setTitle("Now playing: " + song.title)
//         .setThumbnail(song.thumbnail)
//         //.setDescription("")
//         .setTimestamp()
//     interaction.channel.send({embeds: [playingEmbed], fetchReply: true})
// }
async function playSong(interaction, player){
    connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
    });
    let song = songQueue.shift();
    //console.log(song);
    let stream = await play.stream(song.url);

    //Create AudioResource from Stream
    let resource = createAudioResource(stream.stream, {
        inputType: stream.type
    })

    player.play(resource)

    connection.subscribe(player)
}
async function playSongSC(interaction,player,song){

}
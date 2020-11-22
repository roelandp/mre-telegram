/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import Telegraf from 'telegraf';

import * as emoji from 'node-emoji';

/**
 * The main class of this app. All the logic goes here.
 */

// the bottoken as retrieved from BOTFATHER @ TELEGRAM.
// Note you will need to disable privacymode for your bot to receive msgs from a group you add it to. You need to disable this prior to adding it to a group
// Alternatively you can make the bot admin of a group. Admins always receive all msgs, regardless of privacy mode.

const BOT_TOKEN = "INT:STRING";
const BOT_USERNAME = "usernameBot";

// This is the only chat_id which will be displayed on screen.
const CHAT_ID = 0; // when a "group" it most often start with a minus "-1234567890"

// maximum amount of printed lines which should appear
const MAXLINES = 15;

// maximum charwidth per line. After MAXCOLS chars a linebreak should occur.
const MAXCOLS = 70;

// divide text size / position with this amount for ease of formatting in the code below. textheigt = 1/ SIZERATIO (etc)
const SIZERATIO = 10;



export default class Telegram {
	private assets: MRE.AssetContainer;

	private botInstance: any;

	private textblob: MRE.Actor = null;

	private msgs: Array<string>;


	constructor(private context: MRE.Context) {
		this.context.onStarted(() => this.started());
	}

	private started() {
		this.assets = new MRE.AssetContainer(this.context);

		this.msgs = [];

		this.textblob = MRE.Actor.Create(this.context, {
			actor: {
				name: 'Telegramchat',
				transform: {
					local: { position: { x: 0 / SIZERATIO, y: 15 / SIZERATIO, z: 0 / SIZERATIO } }
				},
				appearance: {
					meshId: this.assets.createBoxMesh('box', MAXCOLS/SIZERATIO, MAXLINES/SIZERATIO, 0.1 / SIZERATIO ).id
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				text: {
					contents: "Waiting for chats...",
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 255 / 255, g: 255 / 255, b: 255 / 255 },
					height: 1 / SIZERATIO,
					font: MRE.TextFontFamily.Monospace
				}
			}
		});

		// add some button behaviour to this chat interface.
		const buttonBehavior = this.textblob.setBehavior(MRE.ButtonBehavior);

			// When clicked, do a prompt so users can send a msg back to Telegram.
		buttonBehavior.onClick((user) => {
			user.prompt("<line-height=120%><size=+5>Type a message "+user.name+"!</size><size=80%>\n\nWhatever you type here will be broadcasted back to Telegram prepended with your name.</size></line-height>",true).then(async (res) => {
				if(res.submitted) {


					this.botInstance.telegram.sendMessage(CHAT_ID, `<${user.name}> ${res.text}`);
					this.msgs.unshift(`[${user.name}] ${res.text}`);
					this.updateStdout();
				}
			});
		});

		this.botInstance = new Telegraf(BOT_TOKEN, {username: BOT_USERNAME});

		this.botInstance.on('text', (ctx: any) => {

			if(ctx.update.message.chat.id === CHAT_ID) {
				console.log(ctx.update.message);
				const msg = `<${ctx.update.message.from.first_name}> ${emoji.unemojify(ctx.update.message.text)}`;

				console.log(msg);
				this.msgs.unshift(msg);
				this.updateStdout();

			} else {
				console.log("message does not belong to CHAT_ID ", ctx.update.message.chat.id);
			}
		});

		this.botInstance.startPolling();

	}

	private updateStdout() {

		// already cleanup msgs to only have maxlines.
		this.msgs = this.msgs.slice(0,MAXLINES);

		// now loop through each msg and split newlines after (max!) every Maxcols ..... or break earlier on whitespace (preferred).
		// ideally should stop looping once we reach the end or maxlines. But doesnt do this now, instead loops through msgs.
		let newmsg = "";
		for (let msg of this.msgs) {
			var regexp = new RegExp("\\s*(?:(\\S{"+MAXCOLS+"})|([\\s\\S]{1,"+MAXCOLS+"})(?!\\S))","g"); // STACK OVERFLOW MY FRIEND.
			newmsg += (msg.replace(regexp, function($0,$1,$2) { return $1 ? $1 + "-\n" : $2 + "\n"; } ));
		}

		// this nifty oneliner puts all newlines back into an array, then slices that array back to MAXLINES and finally reformats as string with linebreaks.
		this.textblob.text.contents = newmsg.split("\n").slice(0,MAXLINES).join("\n");
	}

}

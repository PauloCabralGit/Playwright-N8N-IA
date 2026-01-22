require('dotenv').config();
const { Client, GatewayIntentBits } = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!deploy") {
    try {
      const response = await fetch(process.env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "deploy",
          user: message.author.username,
          channel: message.channel.id,
          message: message.content
        })
      });

      if (response.ok) {
        message.reply("🚀 Comando enviado para o n8n!");
      } else {
        message.reply("❌ Erro ao enviar para o n8n.");
      }
    } catch (error) {
      console.error("Erro:", error);
      message.reply("❌ Erro ao processar comando.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

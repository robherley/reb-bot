# frozen_string_literal: true

require 'dotenv/load'
require 'artii'
require 'ruby_cowsay'
require 'json'
require 'faraday'

require_relative './lib/bot'

bot = Rebbot::Bot.new(
  discord_token: ENV['DISCORD_TOKEN'],
  cmd_prefix: ENV['PREFIX'] || '!',
  iex_tokens: {
    public: ENV['IEX_PUB_TOKEN'],
    secret: ENV['IEX_SECRET_TOKEN']
  }
)

bot.command :ping, description: 'test if reb-bot is online' do |event|
  "🏓 pong!\n`[user='#{event.user.name}', channel='#{event.channel.name}', server='#{event.channel.server.name}']`"
end

bot.command :fig, description: 'runs figlet on text' do |_event, *args|
  "```\n#{Artii::Base.new.asciify args.join(' ')[0..20]}```"
end

bot.command :cow, description: 'cowsay something' do |_event, *args|
  "```\n#{Cow.new.say args.join(' ')[0..20]}```"
end

bot.command :ghstat, description: 'reports github status' do |event|
  response = Faraday.get('https://www.githubstatus.com/api/v2/summary.json')
  json = JSON.parse(response.body)

  emoji = {
    'operational' => '🟢',
    'degraded_performance' => '🟡',
    'partial_outage' => '🟡',
    'major_outage' => '🔴'
  }

  event.send ":octopus:  **GitHub Status**: #{json['status']['description']}"

  json['components'].map do |component|
    # metadata component to ignore
    next if component['id'] == '0l2p9nhqnxpd'

    "#{emoji[component['status']] || '❓'} **#{component['name']}**: #{component['description'] || '*<no description>*'}"
  end.compact.sort.join("\n")
end

bot.command :stonk, aliases: [:stonks], description: 'get some stonks for tickers' do |event, *args|
  meta = nil
  args.each do |arg|
    if arg == '--meta'
      meta ||= bot.iex_meta.slice('creditsUsed', 'creditLimit', 'circuitBreaker')
      next
    end

    q = bot.iex.quote(arg)
    pos = q.change_percent.positive?
    emoji = pos ? '📈' : '📉'
    event.send "**#{q.symbol}** is #{pos ? '' : 'not '}stonks #{emoji} `#{q.latest_price} (#{q.change_percent_s})`"
  rescue IEX::Errors::SymbolNotFoundError, IEX::Errors::ClientError
    event.send 'no stonks found'
  end

  "```#{meta}```" if meta
end

bot.command :http, description: 'describe http status code' do |event, *args|
  next unless args.first

  tmp = Tempfile.new('httpcat')
  begin
    response = Faraday.get("https://http.cat/#{args.first[0..2]}")

    if response.headers['content-type'] == 'image/jpeg'
      tmp.write(response.body)
      tmp.rewind
      event.send_file(tmp, filename: 'httpcat.jpg')
    else
      event.send '🤷 🐈'
    end
  ensure
    tmp.close
    tmp.unlink
  end
end

bot.minecraft :mc, host: 'mc.reb.gg'

bot.react on: %w[reb-bot reb bot], with: %w[🤖 🔥 😈]
bot.react on: 'moon', with: %w[🚀 🌙]
bot.react on: 'lumos', with: %w[🐈 ❤️]
bot.react on: 'nox', with: %w[🐈‍⬛ ❤️]
bot.react on: 'moon', with: %w[🚀 🌙]
bot.react on: 'rust', with: %w[🦀]
bot.react on: 'game', with: %w[🕹️ ✨ 🃏]
bot.react on: %w[mc minecraft craft], with: %w[⛏ 💎 ⚔️]
bot.react on: %w[nert nertz nerts], with: %w[❤️ 🃏]
bot.react on: 'raft', with: %w[🚣 🪵 🎣 🦈]
bot.react on: 'ibm', with: %w[👁️ 🐝 Ⓜ️]

bot.run

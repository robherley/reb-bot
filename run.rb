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
  is_raw = false
  is_stats = false
  args.each do |arg|
    case arg
    when '--meta'
      meta = bot.iex_meta.slice('creditsUsed', 'creditLimit', 'circuitBreaker')
      event.send "```#{JSON.pretty_generate(meta)}```"
    when '--raw'
      is_raw = true
    when '--stats'
      is_stats = true
    else
      if is_stats
        stats = bot.iex.key_stats(arg)
        event.send bot.stonk_stats(stats, is_raw: is_raw)
      else
        q = bot.iex.quote(arg)
        return event.send "```#{JSON.pretty_generate(q)}```" if is_raw == true

        msg = "**#{q.symbol}** #{bot.stonk_data(q)}"
        if (q.extended_price_time || 0) > (q.iex_last_updated || 0)
          msg += " after hours: #{bot.stonk_data(q,
                                                 extended: true)}"
        end
        event.send msg
      end
    end
  rescue IEX::Errors::SymbolNotFoundError, IEX::Errors::ClientError
    event.send 'no stonks found'
  end
  nil
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

bot.command :draw, description: 'run stable diffusion on a prompt' do |event, *args|
  next unless args.first

  prompt = args.join(' ')

  data = {
    fn_index: 11,
    data: [prompt, '', 'None', 'None', 20, 'Euler a', false, false, 1, 1, 7, -1, -1, 0, 0, 0, false, 512, 512,
           false, false, 0.7, 'None', false, nil, '', false, 'Seed', '', 'Steps', '', true, false, nil, '', '']
  }

  tmp = Tempfile.new('diffusion')
  begin
    conn = Faraday.new(
      url: 'http://m1.lab.reb.gg:7860',
      headers: { 'Content-Type' => 'application/json' }
    )

    event.send "🎨 Drawing '#{prompt}' ⌛"
    response = conn.post('/api/predict/') do |req|
      req.body = data.to_json
    end

    json = JSON.parse(response.body)
    b64 = json['data'].first.first.split('base64,').last
    tmp.write(Base64.decode64(b64))
    tmp.rewind
    event.send_file(tmp, filename: 'drawing.png')
    # TODO: catch bad
  ensure
    # msg.delete
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
bot.react on: %w[github gh hub], with: %w[🐙 💾 🧑‍💻]

bot.run

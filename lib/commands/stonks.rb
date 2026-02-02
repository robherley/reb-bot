# frozen_string_literal: true

module Rebbot
  module Commands
    class Stonks < Rebbot::Commands::Base
      class WSJBadDataError < StandardError; end

      on :stonks, description: 'get some stonks for a ticker'

      KINDS = %w[quote stats candlesticks].freeze

      def with_options(cmd)
        cmd.string('ticker', 'ticker of stock', required: true)
        cmd.string('kind', 'kind of data to return', choices: KINDS.map { |k| [k, k] })
        cmd.boolean('raw', 'return as raw json')
      end

      def on_event(event)
        ticker = event.options['ticker']
        return event.respond(content: 'invalid ticker') unless ticker.match?(/\A[a-zA-Z]+\z/)
        kind = event.options['kind'] || 'quote'

        payload = case kind
          when 'quote'
            event.bot.fmp.quote(ticker)
          when 'stats'
            event.bot.fmp.stats(ticker)
          when 'candlesticks'
            event.bot.fmp.historical(ticker)
          end

        return event.respond(content: "#{kind} data not found for `#{ticker.upcase}`") unless payload
        event.respond(content: "```json\n#{JSON.pretty_generate(payload)[0..1900]}```")if event.options['raw']

        case kind
        when 'quote'
          send_quote(event, payload)
        when 'stats'
          send_stats(event, payload)
        when 'candlesticks'
          send_candles(event, payload, ticker)
        end

      rescue Faraday::Error => e
        event.respond(content: "💀 An error occurred: #{e.message}")
      end

      private

      def send_quote(event, quote)
        event.respond(content: "**#{quote['symbol']}** #{change_text(quote)}")
      end

      def send_stats(event, profile)
        embed = Discordrb::Webhooks::Embed.new
        embed.title = profile['companyName']
        embed.thumbnail = { url: profile['image'] } if profile['image']
        embed.url = profile['website'] if profile['website']
        embed.add_field(name: 'Ticker', value: profile['symbol'], inline: true)
        embed.add_field(name: 'Price', value: profile['price'].to_s, inline: true)
        embed.add_field(name: 'Exchange', value: profile['exchange'], inline: true)
        embed.add_field(name: 'Market Cap', value: profile['marketCap'].abbr, inline: true)
        embed.add_field(name: 'Volume Avg.', value: profile['averageVolume'].abbr, inline: true)
        embed.add_field(name: '52 Week Range', value: profile['range'], inline: true)
        embed.add_field(name: 'IPO', value: profile['ipoDate'], inline: true)
        embed.add_field(name: 'Employees', value: profile['fullTimeEmployees'].to_i.commas, inline: true)
        embed.add_field(name: 'CEO', value: profile['ceo'], inline: true)
        embed.add_field(name: 'Industry', value: profile['industry'], inline: true)
        embed.add_field(name: 'Sector', value: profile['sector'], inline: true)

        event.respond(embeds: [embed])
      end

      def send_candles(event, historical, ticker)
        data = historical.reverse.map { |entry| entry.transform_keys(&:to_sym) }
        return if data.empty?

        chart = Gruff::Candlestick.new(1200)
        data.each do |entry|
          chart.data(**entry.slice(:low, :high, :open, :close))
        end

        chart.down_color = "#D54A45"
        chart.up_color = "#59A74B"
        chart.theme = {
          background_colors: %w[#0a0a0a, #0a0a0a],
          font_color: '#EDEDED',
          marker_color: '#292929',
        }
        chart.spacing_factor = 0.25

        day = DateTime.parse(data.first[:date]).strftime('%-m/%d')
        chart.title = "#{ticker} #{day}"
        chart.label_rotation = 45.0
        labels = data.each_with_index
          .map { |v, i| [i, DateTime.parse(v[:date]).strftime('%-l:%M %p')] }
        if labels.size > 40
            labels = labels.select { |i, _| (i % 5).zero? }
        elsif labels.size > 20
          labels = labels.select { |i, _| i.even? }
        end
        chart.labels = labels.to_h

        max = data.map { |e| e[:high] }.max
        chart.maximum_value = max

        min = data.map { |e| e[:low] }.min
        chart.minimum_value = min

        tmpfile = Tempfile.new(['chart', '.png'])
        chart.write(tmpfile.path)
        event.respond do |builder|
          builder.attachments = [tmpfile]
        end
      ensure
        tmpfile&.close
        tmpfile&.unlink
      end

      def change_text(quote)
        pos = quote['changePercentage']&.positive?
        "is #{pos ? '' : 'not '}stonks #{pos ? '📈' : '📉'} " \
          "`$#{quote['price']} (#{quote['changePercentage']&.round(2)}%)`"
      end
    end
  end
end

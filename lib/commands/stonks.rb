# frozen_string_literal: true

module Rebbot
  module Commands
    class Stonks < Rebbot::Commands::Base
      class WSJBadDataError < StandardError; end

      on :stonks, description: 'get some stonks for a ticker'

      def with_options(cmd)
        cmd.string('ticker', 'ticker of stock', required: true)
        cmd.boolean('stats', 'return key statistics')
        cmd.boolean('raw', 'return as raw json')
      end

      def on_event(event)
        ticker = event.options['ticker']
        is_stats = event.options['stats']
        payload = is_stats ? profile(ticker) : quote(ticker)

        return event.respond(content: "no #{is_stats ? 'stats' : 'stonks'} found for `#{ticker.upcase}`") unless payload
        return event.respond(content: "```json\n#{JSON.pretty_generate(payload)}```") if event.options['raw']

        is_stats ? send_stats(event, payload) : send_quote(event, payload)
      rescue Faraday::Error => e
        event.respond(content: "💀 An error occurred: #{e.message}")
      end

      private

      def stonks_api
        Faraday.new(
          url: 'https://financialmodelingprep.com',
          params: {
            apikey: ENV['FMP_APIKEY']
          }
        ) do |c|
          c.use Faraday::Response::RaiseError
          c.response :json
        end
      end

      def quote(query)
        stonks_api.get("/api/v3/quote/#{query}").body&.first
      end

      def profile(query)
        stonks_api.get("/api/v3/profile/#{query}").body&.first&.except('description')
      end

      def wsj(ticker)
        conn = Faraday.new(
          url: 'https://www.wsj.com',
          headers: {
            'User-Agent': 'rebbot'
          }
        ) do |c|
          c.use Faraday::Response::RaiseError
        end

        conn.get("/market-data/quotes/#{ticker}").body
      rescue Faraday::Error
        nil
      end

      def after_hours(ticker)
        attempts ||= 0

        res = wsj(ticker)
        return nil unless res

        html = Nokogiri::HTML4(res)
        snag = ->(v) { html.css(v)&.first&.text&.to_f }

        quote = {
          'price' => snag.call('#ms_quote_val'),
          'change' => snag.call('#ms_quote_change'),
          'changesPercentage' => snag.call('#ms_quote_changePer')
        }.compact

        raise WSJBadDataError unless quote.any?

        quote
      rescue WSJBadDataError
        retry if (attempts += 1) < 3

        nil
      end

      def market_open?
        now = TZInfo::Timezone.get('America/New_York').now
        return false if now.saturday? || now.sunday?
        return false if now.hour == 9 && now.min < 30

        now.hour > 9 && now.hour < 16
      end

      def send_quote(event, quote)
        content = "**#{quote['symbol']}** #{change_text(quote)}"

        unless market_open? || quote['exchange'] == 'CRYPTO'
          after_quote = after_hours(quote['symbol'])
          content += "\n🌙 After hours #{change_text(after_quote)}" if after_quote&.any?
        end

        event.respond(content: content)
      end

      def send_stats(event, profile)
        embed = Discordrb::Webhooks::Embed.new
        embed.title = profile['companyName']
        embed.thumbnail = { url: profile['image'] } if profile['image']
        embed.url = profile['website'] if profile['website']
        embed.add_field(name: 'Ticker', value: profile['symbol'], inline: true)
        embed.add_field(name: 'Price', value: profile['price'].to_s, inline: true)
        embed.add_field(name: 'Exchange', value: profile['exchangeShortName'], inline: true)
        embed.add_field(name: 'Market Cap', value: profile['mktCap'].abbr, inline: true)
        embed.add_field(name: 'Volume Avg.', value: profile['volAvg'].abbr, inline: true)
        embed.add_field(name: '52 Week Range', value: profile['range'], inline: true)
        embed.add_field(name: 'IPO', value: profile['ipoDate'], inline: true)
        embed.add_field(name: 'Employees', value: profile['fullTimeEmployees'].to_i.commas, inline: true)
        embed.add_field(name: 'CEO', value: profile['ceo'], inline: true)
        embed.add_field(name: 'Industry', value: profile['industry'], inline: true)
        embed.add_field(name: 'Sector', value: profile['sector'], inline: true)

        event.respond(embeds: [embed])
      end

      def change_text(quote)
        pos = quote['changesPercentage']&.positive?
        "is #{pos ? '' : 'not '}stonks #{pos ? '📈' : '📉'} " \
          "`$#{quote['price']} (#{quote['changesPercentage']&.round(2)}%)`"
      end
    end
  end
end

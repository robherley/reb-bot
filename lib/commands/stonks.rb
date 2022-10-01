# frozen_string_literal: true

module Rebbot
  module Commands
    class Stonks < Rebbot::Commands::Base
      on :stonks, description: 'get some stonks for a ticker'

      def initialize
        super

        Money.rounding_mode = BigDecimal::ROUND_HALF_EVEN

        @iex_client = IEX::Api::Client.new(
          publishable_token: ENV['IEX_PUB_TOKEN'],
          secret_token: ENV['IEX_SECRET_TOKEN'],
          endpoint: 'https://cloud.iexapis.com/v1'
        )
      end

      def with_options(cmd)
        cmd.string('ticker', 'ticker of stock', required: true)
        cmd.boolean('stats', 'return key statistics')
        cmd.boolean('raw', 'return as raw json')
      end

      def on_event(event)
        ticker = event.options['ticker']
        is_stats = event.options['stats']
        payload = is_stats ? fetch_stats(ticker) : fetch_stonk(ticker)

        return event.respond(content: "```json\n#{JSON.pretty_generate(payload)}```") if event.options['raw']

        content = is_stats ? build_stats(ticker, payload) : build_stonk(payload)
        event.respond(content: content)
      end

      private

      def fetch_stonk(ticker)
        @iex_client.quote(ticker)
      rescue IEX::Errors::SymbolNotFoundError, IEX::Errors::ClientError
        nil
      end

      def build_stonk(payload)
        after_hours = (payload.extended_price_time || 0) > (payload.iex_last_updated || 0)

        content = "**#{payload.symbol}** #{change_text(payload.latest_price, payload.change_percent)}"

        if after_hours
          content += "\n🌙 After hours #{change_text(payload.extended_price, payload.extended_change_percent)}"
        end

        content
      end

      def fetch_stats(ticker)
        @iex_client.key_stats(ticker)
      rescue IEX::Errors::SymbolNotFoundError, IEX::Errors::ClientError
        nil
      end

      def build_stats(ticker, payload)
        title = "**#{payload.company_name}** (#{ticker.upcase})"
        employees = "🧑 **Employees**: `#{payload.employees}`"
        market_cap = "💰 **Market Cap**: `#{payload.market_cap_dollar}`"
        next_earnings = "🗓️ **Earnings Date**: `#{payload.next_earnings_date}`" unless payload.next_earnings_date.empty?

        pos = payload.ytd_change_percent&.positive?
        ytd = "#{emoji(pos)} **YTD**: `#{payload.ytd_change_percent_s}`"

        [title, employees, market_cap, next_earnings, ytd].compact.join("\n")
      end

      def change_text(price, change)
        pos = change&.positive?

        "is #{pos ? '' : 'not '}stonks #{emoji(pos)} `$#{price} (#{(change * 100).round(2)}%)`"
      end

      def emoji(pos)
        pos ? '📈' : '📉'
      end
    end
  end
end

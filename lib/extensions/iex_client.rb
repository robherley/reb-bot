# frozen_string_literal: true

require 'iex-ruby-client'

module Rebbot
  module Extensions
    module IEXClient
      def iex
        return @iex_client if defined? @iex_client

        build_client
      end

      def iex_meta
        iex.get('/account/metadata', token: iex.secret_token)
      end

      def stonk_data(stonk, extended: false)
        pos = stonk.send(stonk_method(:change_percent, extended))&.positive?
        emoji = stonks_emoji(pos)
        "is #{pos ? '' : 'not '}stonks #{emoji} `$#{stonk.send(stonk_method(:latest_price, extended))} (#{stonk.send(stonk_method(:change_percent_s, extended))})`"
      end

      def stonk_stats(stats, is_raw: false)
        return "```#{JSON.pretty_generate(stats)}```" if is_raw == true

        employees = "🧑 **Employees**: `#{stats['employees']}`"
        market_cap = "💰 **Market Cap**: `#{stats['market_cap_dollar']}`"
        next_earnings = "🗓️ **Earnings Date**: `#{stats['next_earnings_date']}`"

        pos = stats['ytd_change_percent']&.positive?
        emoji = stonks_emoji(pos)
        ytd = "#{emoji} **YTD**: `#{stats['ytd_change_percent_s']}`"

        "#{employees}\n#{market_cap}\n#{next_earnings}\n#{ytd}"
      end

      private

      def stonks_emoji(pos)
        pos ? '📈' : '📉'
      end

      def build_client
        @iex_client = IEX::Api::Client.new(
          publishable_token: @options[:iex_tokens][:public],
          secret_token: @options[:iex_tokens][:secret],
          endpoint: 'https://cloud.iexapis.com/v1'
        )
      end

      def stonk_method(method, extended)
        return method unless extended

        method.to_s.gsub(/^(latest_|)/, 'extended_').to_sym
      end
    end
  end
end

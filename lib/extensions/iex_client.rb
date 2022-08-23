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
        iex.get('/account/metadata', token: @iex_tokens[:secret])
      end

      def stonk_data(stonk, extended: false)
        pos = stonk.send(stonk_method(:change_percent, extended)).positive?
        emoji = pos ? '📈' : '📉'
        "is #{pos ? '' : 'not '}stonks #{emoji} `$#{stonk.send(stonk_method(:latest_price, extended))} (#{stonk.send(stonk_method(:change_percent_s, extended))})`"
      end

      private

      def build_client
        @iex_client = IEX::Api::Client.new(
          publishable_token: @iex_tokens[:public],
          secret_token: @iex_tokens[:secret],
          endpoint: 'https://cloud.iexapis.com/v1'
        )
      end

      def stonk_method(method, _extended)
        method.to_s.gsub(/^(latest_|)/, 'extended_')
      end
    end
  end
end

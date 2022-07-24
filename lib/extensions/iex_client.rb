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

      private

      def build_client
        @iex_client = IEX::Api::Client.new(
          publishable_token: @iex_tokens[:public],
          secret_token: @iex_tokens[:secret],
          endpoint: 'https://cloud.iexapis.com/v1'
        )
      end
    end
  end
end

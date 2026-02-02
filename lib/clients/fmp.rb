# frozen_string_literal: true

require 'gruff'
require 'faraday'

module Rebbot
  module Clients
    class FMP
      def initialize(apikey)
        @apikey = apikey
        @client = Faraday.new(
          url: 'https://financialmodelingprep.com',
          params: { apikey: }
        ) do |c|
          c.use Faraday::Response::RaiseError
          c.response :json
        end
      end

      def quote(ticker)
        @client.get('/stable/quote', symbol: ticker).body&.first
      end

      def stats(ticker)
        @client.get('/stable/profile', symbol: ticker).body&.first&.except('description')
      end

      def historical(ticker)
        last_ts = quote(ticker)['timestamp']
        day = TZInfo::Timezone.get('America/New_York').utc_to_local(Time.at(last_ts)).strftime('%Y-%m-%d')
        @client.get('/stable/historical-chart/5min', symbol: ticker, from: day, to: day).body
      end
    end
  end
end

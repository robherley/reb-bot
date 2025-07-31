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
        quote_data = @client.get("/api/v3/quote/#{ticker}").body&.first
        return nil unless quote_data
        
        # Try to get after hours data if regular quote doesn't include it
        if !quote_data['afterMarketPrice'] && !quote_data['extendedHoursPrice']
          after_hours_data = get_after_hours_data(ticker)
          quote_data.merge!(after_hours_data) if after_hours_data
        end
        
        quote_data
      end

      def stats(ticker)
        @client.get("/api/v3/profile/#{ticker}").body&.first&.except('description')
      end

      def historical(ticker)
        # Get quote data without after hours enhancement to avoid recursion
        quote_data = @client.get("/api/v3/quote/#{ticker}").body&.first
        return [] unless quote_data
        
        last_ts = quote_data['timestamp']
        day = TZInfo::Timezone.get('America/New_York').utc_to_local(Time.at(last_ts)).strftime('%Y-%m-%d')
        @client.get("/api/v3/historical-chart/5min/#{ticker}?from=#{day}&to=#{day}").body
      end

      private

      def get_after_hours_data(ticker)
        # Try multiple FMP endpoints for after hours data
        endpoints = [
          "/api/v3/pre-post-market-trade/#{ticker}",
          "/api/v3/aftermarket-trade/#{ticker}",
          "/api/v3/extended-hours/#{ticker}"
        ]
        
        endpoints.each do |endpoint|
          begin
            response = @client.get(endpoint).body
            if response.is_a?(Array) && response.first
              data = response.first
            elsif response.is_a?(Hash)
              data = response
            else
              next
            end
            
            # Map different response formats to standard fields
            return extract_after_hours_fields(data) if data
          rescue Faraday::Error
            # Try next endpoint if this one fails
            next
          end
        end
        
        # If FMP doesn't have after hours data, try Yahoo Finance as fallback
        get_yahoo_after_hours_data(ticker)
      rescue => e
        # Return nil if all methods fail
        nil
      end

      def extract_after_hours_fields(data)
        after_hours_info = {}
        
        # Map various possible field names to our standard names
        after_hours_info['afterMarketPrice'] = data['afterMarketPrice'] || 
                                              data['extendedHoursPrice'] || 
                                              data['postMarketPrice'] ||
                                              data['price']
        
        after_hours_info['afterMarketChange'] = data['afterMarketChange'] || 
                                               data['extendedHoursChange'] || 
                                               data['postMarketChange'] ||
                                               data['change']
        
        after_hours_info['afterMarketChangePercent'] = data['afterMarketChangePercent'] || 
                                                      data['extendedHoursChangePercent'] || 
                                                      data['postMarketChangePercent'] ||
                                                      data['changesPercentage']
        
        # Only return if we have meaningful after hours data
        after_hours_info['afterMarketPrice'] && after_hours_info['afterMarketChange'] ? after_hours_info : nil
      end

      def get_yahoo_after_hours_data(ticker)
        # Fallback to Yahoo Finance for after hours data
        yahoo_client = Faraday.new(url: 'https://query1.finance.yahoo.com') do |c|
          c.use Faraday::Response::RaiseError
          c.response :json
        end
        
        response = yahoo_client.get("/v8/finance/chart/#{ticker}").body
        result = response.dig('chart', 'result', 0)
        return nil unless result
        
        meta = result['meta']
        return nil unless meta
        
        # Yahoo Finance includes after hours data in the meta section
        after_hours_price = meta['postMarketPrice']
        after_hours_change = meta['postMarketChange']
        after_hours_change_percent = meta['postMarketChangePercent']
        
        if after_hours_price && after_hours_change
          {
            'afterMarketPrice' => after_hours_price,
            'afterMarketChange' => after_hours_change,
            'afterMarketChangePercent' => after_hours_change_percent
          }
        else
          nil
        end
      rescue => e
        # Return nil if Yahoo Finance fails too
        nil
      end
    end
  end
end

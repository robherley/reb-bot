# frozen_string_literal: true

module Rebbot
  module Commands
    class XKCD < Rebbot::Commands::Base
      on :xkcd, description: 'xkcd comic'

      def with_options(cmd)
        cmd.integer('number', 'comic number', required: true)
      end

      def on_event(event)
        response = xkcd(event.options['number']).get
        json = JSON.parse(response.body)

        event.respond(content: json['img'])
      rescue Faraday::Error, JSON::ParserError => e
        event.edit_response(content: "💀 An error occurred: #{e}, help! <@#{Rebbot::ROB_ID}>")
      end

      private

      def xkcd(number)
        Faraday.new(
          url: "https://xkcd.com/#{number}/info.0.json",
          headers: { 'Content-Type' => 'application/json' }
        ) do |c|
          c.use Faraday::Response::RaiseError
        end
      end
    end
  end
end

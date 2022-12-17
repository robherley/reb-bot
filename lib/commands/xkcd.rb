# frozen_string_literal: true

module Rebbot
  module Commands
    class XKCD < Rebbot::Commands::Base
      on :xkcd, description: 'xkcd comic'

      def with_options(cmd)
        cmd.integer('number', 'comic number (omit for random)')
      end

      def on_event(event)
        number = event.options['number'] || rand(1..latest['num'])
        json = comic(number)
        event.respond(embeds: [
          {
            title: "#{number}: #{json['safe_title']}",
            url: "https://xkcd.com/#{number}",
            image: { url: json['img'] },
            description: json['alt']
          }
        ])
      rescue Faraday::Error, JSON::ParserError => e
        if e.is_a?(Faraday::ResourceNotFound)
          event.respond(content: '🤷 Comic not found')
        else
          event.respond(content: "💀 An error occurred: #{e}, help! <@#{Rebbot::ROB_ID}>")
        end
      end

      private

      def comic(number = nil)
        response = xkcd.get("/#{number}/info.0.json")
        JSON.parse(response.body)
      end

      def latest
        response = xkcd.get('/info.0.json')
        JSON.parse(response.body)
      end

      def xkcd
        Faraday.new(
          url: 'https://xkcd.com',
          headers: { 'Content-Type' => 'application/json' }
        ) do |c|
          c.use Faraday::Response::RaiseError
        end
      end
    end
  end
end

# frozen_string_literal: true

module Rebbot
  module Commands
    class Ping < Rebbot::Commands::Base
      on :ping, description: 'give reb-bot a ping, maybe you will get a pong'

      def on_event(event)
        meta = {
          user: event.user.name,
          is_admin: event.from_admin?,
          channel: event.channel.name,
          server: event.channel.server.name,
          version: ENV['VERSION'] || 'unknown'
        }

        event.respond(content: "🏓 pong!\n`#{meta}`")
      end
    end
  end
end

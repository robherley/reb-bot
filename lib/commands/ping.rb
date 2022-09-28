# frozen_string_literal: true

module Rebbot
  module Commands
    class Ping
      def initialize
        # noop
      end

      def register(bot)
        bot.register_application_command(:ping, 'give reb-bot a ping', server_id: Rebbot::TESTING_SERVER_ID)
      end

      def add_handler(bot)
        bot.application_command(:ping) do |event|
          event.respond(content: 'PONG')
        end
      end
    end
  end
end

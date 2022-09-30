# frozen_string_literal: true

module Rebbot
  module Commands
    class Cowsay < Rebbot::Commands::Base
      on :cowsay, description: 'have a cow say something'

      def with_options(cmd)
        cmd.string('message', 'have a cow say something', required: true)
        cmd.string('type', 'type of cow')
      end

      def on_event(event)
        type = Cow.cows.find { |cow| cow == event.options['type'] } || 'default'
        msg = event.options['message'][0..Cow::MAX_LINE_LENGTH]
        event.respond(content: "```\n#{Cow.new(cow: type).say(msg)}```")
      end
    end
  end
end

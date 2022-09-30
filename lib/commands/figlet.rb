# frozen_string_literal: true

module Rebbot
  module Commands
    class Figlet < Rebbot::Commands::Base
      on :figlet, description: 'runs figlet on input text'

      def with_options(cmd)
        cmd.string('message', 'Message to figlet-ify', required: true)
      end

      def on_event(event)
        event.respond(content: "```\n#{Artii::Base.new.asciify event.options['message'][0..20]}```")
      end
    end
  end
end

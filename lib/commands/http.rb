# frozen_string_literal: true

module Rebbot
  module Commands
    class HTTP < Rebbot::Commands::Base
      on :http, description: 'describe an http status code'

      ANIMALS = %w[
        cat
        dog
      ].freeze

      def with_options(cmd)
        cmd.integer('code', 'status code', required: true)
        cmd.string('animal', 'what animal?', choices: self.ANIMALS.map { |a| [a, a] })
      end

      def on_event(event)
        event.respond(content: url(event.options['code'], event.options['animal']))
      end

      def url(code, animal)
        return "https://http.dog/#{code}.jpg" if animal == 'dog'

        "https://http.cat/#{code}"
      end
    end
  end
end

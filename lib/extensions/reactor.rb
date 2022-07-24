# frozen_string_literal: true

module Rebbot
  module Extensions
    module Reactor
      attr_reader :reactions

      def react(on:, with:)
        @reactions ||= {}

        keywords = on.is_a?(Array) ? on : [on]

        keywords.each do |keyword|
          existing = @reactions[keyword.downcase] || []
          @reactions[keyword] = (existing + with).uniq
        end
      end
    end
  end
end

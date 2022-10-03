# frozen_string_literal: true

module Rebbot
  module Events
    module Deprecated
      extend Discordrb::EventContainer

      message do |event|
        sym, *rest = event.message.content.chars

        next unless %w[! $].include? sym

        command = rest.join
        next unless %w[ping fig cow ghstat stonk http mc draw].any? { |c| command.start_with? c }

        event.message.reply!('i use slash commands now! try typing `/` in the chat')
      end
    end
  end
end

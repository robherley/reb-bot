# frozen_string_literal: true

module Rebbot
  module Events
    module Reaction
      extend Discordrb::EventContainer

      message do |event|
        next if event.message.from_bot?

        matching = event.message.content.split("\s").map(&:downcase) & event.bot.reactions.keys
        matching.each do |key|
          event.bot.reactions[key].each { |emoji| event.message.react(emoji) }
        end
      end
    end
  end
end

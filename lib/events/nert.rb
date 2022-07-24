# frozen_string_literal: true

module Rebbot
  module Events
    module Nert
      extend Discordrb::EventContainer

      # requires: opus and ffmpeg

      message(contains: 'nert') do |event|
        next if event.message.from_bot?

        # %w[❤️ 🃏].each { |emoji| event.message.react(emoji) }

        channel = event.user.voice_channel

        next unless channel


        event.bot.voice_connect(channel)
        binding.pry
        event.bot.voice.volume = 2.0
        event.voice.play_file('assets/audio/nertz.mp3')
        # event.bot.voice.destroy
      end
    end
  end
end

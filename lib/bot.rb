# frozen_string_literal: true

require 'discordrb'

require_relative './constants'
require_relative './event'

Dir[File.expand_path('./extensions/*.rb', __dir__)].sort.each { |file| require file }
Dir[File.expand_path('./events/*.rb', __dir__)].sort.each { |file| require file }
Dir[File.expand_path('./commands/*.rb', __dir__)].sort.each { |file| require file }

module Rebbot
  class Bot < Discordrb::Bot
    # Rebbot::Extensions.constants.each do |const|
    #   include Rebbot::Extensions.const_get(const)
    # end

    attr_reader :options

    def initialize(**kwargs)
      super(
        token: kwargs[:discord_token],
        intents: :all
      )
      @options = kwargs

      # Rebbot::Events.constants.each do |const|
      #   include! Rebbot::Events.const_get(const)
      # end

      cmd = Rebbot::Commands::Ping.new
      cmd.register(self)
      cmd.add_handler(self)
    end
  end
end

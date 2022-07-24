# frozen_string_literal: true

require 'discordrb'
require 'pry'

Dir[File.expand_path('./extensions/*.rb', __dir__)].sort.each { |file| require file }
Dir[File.expand_path('./events/*.rb', __dir__)].sort.each { |file| require file }

module Rebbot
  class Bot < Discordrb::Commands::CommandBot
    include Rebbot::Extensions::Minecraft
    include Rebbot::Extensions::Reactor
    include Rebbot::Extensions::IEXClient

    def initialize(**kwargs)
      super(token: kwargs[:discord_token], prefix: kwargs[:cmd_prefix])
      @iex_tokens = kwargs[:iex_tokens]

      Rebbot::Events.constants.each do |const|
        include! Rebbot::Events.const_get(const)
      end
    end
  end
end

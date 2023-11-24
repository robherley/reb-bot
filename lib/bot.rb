# frozen_string_literal: true

require_relative './constants'
require_relative './util'

Dir[File.expand_path('./clients/*.rb', __dir__)].sort.each { |file| require file }
Dir[File.expand_path('./commands/*.rb', __dir__)].sort.each { |file| require file }
Dir[File.expand_path('./events/*.rb', __dir__)].sort.each { |file| require file }

module Rebbot
  class Bot < Discordrb::Bot
    attr_reader :redis, :twitter

    def initialize(**kwargs)
      super(
        token: kwargs[:discord_token],
        intents: :all
      )

      add_command_handlers
      connect_redis
      setup_twitter

      include! Rebbot::Events::Deprecated
      include! Rebbot::Events::TwitterUnfurl
    end

    # all of the defined Rebbot::Commands
    def commands
      return @commands if defined? @commands

      @commands = (Rebbot::Commands.constants - [:Base]).map { |c| Rebbot::Commands.const_get(c).new }
    end

    # registers commannds on a specific server (nil for global)
    def registered_commands(server_id)
      get_application_commands(server_id: server_id)
    end

    # registers commannds on a specific server (nil for global)
    def register_commands!(server_id)
      commands.map { |cmd| cmd.register_to_server(self, server_id: server_id) }
    end

    # deletes commands on a specific server (nil for global)
    def delete_commands!(server_id)
      registered_commands(server_id).each(&:delete)
    end

    # deletes commands then registers on a specific server (nil for global)
    def reload_commands!(server_id)
      delete_commands!(server_id)
      register_commands!(server_id)
    end

    private

    # setup handler for all the defined Rebbot::Commands
    def add_command_handlers
      commands.each { |cmd| cmd.add_handler(self) }
    end

    def connect_redis
      @redis = Redis.new(url: ENV['REDIS_URL'])
    end

    def setup_twitter
      @twitter = Rebbot::Clients::Twitter.new
    end
  end
end

# add some message helpers
class Discordrb::Events::ApplicationCommandEvent
  def from_admin?
    Rebbot::ADMIN_IDS.include? user.id
  end

  def from_test_server?
    Rebbot::TEST_SERVER_IDS.include? server.id
  end
end

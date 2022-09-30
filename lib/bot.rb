# frozen_string_literal: true

require_relative './constants'

Dir[File.expand_path('./extensions/*.rb', __dir__)].sort.each { |file| require file }
Dir[File.expand_path('./events/*.rb', __dir__)].sort.each { |file| require file }
Dir[File.expand_path('./commands/*.rb', __dir__)].sort.each { |file| require file }

module Rebbot
  class Bot < Discordrb::Bot
    alias registered_commands get_application_commands

    def initialize(**kwargs)
      super(
        token: kwargs[:discord_token],
        intents: :all
      )

      add_command_handlers
    end

    # all of the defined Rebbot::Commands
    def commands
      return @commands if defined? @commands

      @commands = (Rebbot::Commands.constants - [:Base]).map { |c| Rebbot::Commands.const_get(c).new }
    end

    # registers commannds to a server, or nil for global
    def register_commands!(server_id)
      commands.map { |cmd| cmd.register_to_server(self, server_id: server_id) }
    end

    # deletes commannds to a server, or nil for global
    def delete_commands!(server_id)
      registered_commands(server_id: server_id).each(&:delete)
    end

    private

    # setup handler for all the defined Rebbot::Commands
    def add_command_handlers
      commands.each { |cmd| cmd.add_handler(self) }
    end
  end
end

# add some message helpers
class Discordrb::Events::ApplicationCommandEvent
  def from_admin?
    Rebbot::ADMIN_IDS.include? user.id
  end

  def from_test_server?
    Rebbot::TEST_SERVER_ID == server.id
  end
end

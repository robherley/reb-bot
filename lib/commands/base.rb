# frozen_string_literal: true

module Rebbot
  module Commands
    class Base
      class << self
        attr_accessor :keyword, :description

        def on(keyword, description:)
          @keyword = keyword
          @description = description
        end
      end

      def initialize; end

      def keyword
        self.class.keyword
      end

      def description
        self.class.description
      end

      # specifies any command options
      def with_options(cmd)
        # optional, implemented by subclass
      end

      # basic application command event handler
      def on_event(event)
        # optional, implemented by subclass
      end

      # when 'on_event' is not enough (ie: requires subcommands)
      def custom(bot)
        # optional, implemented by subclass
      end

      # adds a handler to the bot for the command
      def add_handler(bot)
        bot.application_command(self.class.keyword) do |event|
          on_event(event)
        end

        custom(bot)
      end

      # will register a bot's command to a specific server id, nil for global
      def register_to_server(bot, server_id: nil)
        bot.register_application_command(
          self.class.keyword,
          self.class.description,
          server_id: server_id
        ) do |opts|
          with_options(opts)
        end
      end
    end
  end
end

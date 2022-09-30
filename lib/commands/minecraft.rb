# frozen_string_literal: true

module Rebbot
  module Commands
    class Minecraft < Rebbot::Commands::Base
      on :mc, description: 'check minecraft server status'

      SERVERS = [
        { host: 'mc.reb.gg', port: 25565, bedrock: false }
      ].freeze

      def with_options(cmd)
        cmd.string('server', 'server to ping', choices: SERVERS.map { |s| [s[:host], s[:host]] }, required: true)
      end

      def on_event(event)
        server = SERVERS.find { |s| s[:host] == event.options['server'] }

        return event.respond(content: 'server not found') unless server

        stats = MineStat.new(
          server[:host],
          server[:port],
          2, # timeout in seconds
          server[:bedrock] ? MineStat::Request::BEDROCK : MineStat::Request::JSON
        )

        event.respond(embeds: [build_embed(stats)])
      end

      private

      def build_embed(stats)
        embed = Discordrb::Webhooks::Embed.new
        embed.thumbnail = { url: 'https://i.imgur.com/5DnHbTs.png' }
        embed.add_field(name: 'Host', value: stats.address, inline: true)
        embed.add_field(name: 'Port', value: stats.port, inline: true)
        if stats.online
          embed.color = '#42BE65'
          embed.title = stats.stripped_motd
          embed.description = 'Server is online!'
          embed.add_field(name: 'Version', value: stats.version, inline: true)
          embed.add_field(name: 'Players', value: "#{stats.current_players}/#{stats.max_players}", inline: true)
          embed.add_field(name: 'Ping', value: "#{stats.latency}ms", inline: true)
        else
          embed.color = '#FA4D56'
          embed.title = 'Minecraft server'
          embed.description = 'Server is offline.'
        end

        embed
      end
    end
  end
end

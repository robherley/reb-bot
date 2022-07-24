# frozen_string_literal: true

require 'minestat'

module Rebbot
  module Extensions
    module Minecraft
      def minecraft(keyword, host:, port: nil, bedrock: false)
        if port.nil?
          port = bedrock ? MineStat::DEFAULT_BEDROCK_PORT : MineStat::DEFAULT_TCP_PORT
        end

        command(keyword, description: "minecraft server status for `#{host}`") do |event|
          stats = MineStat.new(
            host,
            port,
            2, # timeout in seconds
            bedrock ? MineStat::Request::BEDROCK : MineStat::Request::JSON
          )
          event.send_embed do |embed|
            build_embed(stats, embed)
          end
        end
      end

      private

      def build_embed(stats, embed)
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
      end
    end
  end
end

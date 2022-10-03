# frozen_string_literal: true

module Rebbot
  module Commands
    class GithubStatus < Rebbot::Commands::Base
      on :'github-status', description: 'returns github status as emojis'

      def on_event(event)
        json = fetch_status
        content = ":octopus:  **GitHub Status**: #{json['status']['description']}\n"
        content += json['components'].map do |component|
          # metadata component to ignore
          next if component['id'] == '0l2p9nhqnxpd'

          "#{emoji(component['status'])} **#{component['name']}**: #{component['description'] || '*<no description>*'}"
        end.compact.sort.join("\n")

        event.respond(content: content)
      end

      def fetch_status
        response = Faraday.get('https://www.githubstatus.com/api/v2/summary.json')
        JSON.parse(response.body)
      end

      def emoji(status)
        {
          'operational' => '🟢',
          'degraded_performance' => '🟡',
          'partial_outage' => '🟡',
          'major_outage' => '🔴'
        }[status] || '❓'
      end
    end
  end
end

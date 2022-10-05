# frozen_string_literal: true

module Rebbot
  module Commands
    class BigBrain < Rebbot::Commands::Base
      on :'big-brain', description: 'give out some 🧠'

      REDIS_KEY = 'brains'

      def with_options(cmd)
        cmd.user('user', 'user to give brain (omit to see leaderboard)')
      end

      def on_event(event)
        sender = event.user.id
        receiver = event.options['user']&.to_i

        return leaderboard(event) unless receiver

        return event.respond(content: "🙅 <@#{sender}> smol brain move! 👎") if sender == receiver

        n = event.bot.redis.zincrby(REDIS_KEY, 1, receiver)&.to_i

        response = "🫡 <@#{sender}> thinks <@#{receiver}> has a big brain! 🤔\n"
        response += n > 1 ? "They now have #{n} brains! #{'🧠' * n}" : 'It\'s their first brain! 🏅🧠'
        event.respond(content: response)
      end

      private

      def leaderboard(event)
        top10 = event.bot.redis.zrevrange(REDIS_KEY, 0, -1, with_scores: true)

        rows = top10.map do |user_id, score|
          user = event.server.members.find { |m| m.id == user_id&.to_i }
          name = user&.distinct || user_id
          [name, score.to_i]
        end

        table = Terminal::Table.new do |t|
          t.headings = %w[User Brains]
          t.rows = rows
          t.align_column(1, :right)
          t.style = { border: :unicode }
        end

        event.respond(content: "```🧠 Big Brain Leaderboard 🧠\n#{table}```")
      end
    end
  end
end

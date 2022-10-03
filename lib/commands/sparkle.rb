# frozen_string_literal: true

module Rebbot
  module Commands
    class Sparkle < Rebbot::Commands::Base
      on :sparkle, description: 'give out some ✨'

      REDIS_KEY = 'sparkles'

      def with_options(cmd)
        cmd.user('user', 'user to sparkle (omit to see leaderboard)')
      end

      def on_event(event)
        sparkler = event.user.id
        sparklee = event.options['user']&.to_i

        return sparkle_table(event) unless sparklee

        return event.respond(content: "🙅 <@#{sparkler}> you can\'t sparkle yourself! 👎") if sparkler == sparklee

        n = event.bot.redis.zincrby(REDIS_KEY, 1, sparklee)&.to_i

        response = "✨ <@#{sparkler}> gave <@#{sparklee}> a sparkle! ✨\n"
        response += n > 1 ? "They now have #{n} sparkles! 🌟" : 'It\'s their first sparkle! 🏅'
        event.respond(content: response)
      end

      private

      def sparkle_table(event)
        top10 = event.bot.redis.zrange('sparkles', 0, 10, rev: true, with_scores: true)

        rows = top10.map do |user_id, score|
          user = event.server.members.find { |m| m.id == user_id&.to_i }
          name = user&.distinct || user_id
          [name, score.to_i]
        end

        table = Terminal::Table.new do |t|
          t.headings = %w[User Sparkles]
          t.rows = rows
          t.align_column(1, :right)
          t.style = { border: :unicode }
        end

        event.respond(content: "```✨ Sparkles Leaderboard ✨\n#{table}```")
      end
    end
  end
end

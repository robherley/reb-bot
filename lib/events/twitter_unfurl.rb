# frozen_string_literal: true

module Rebbot
  module Events
    module TwitterUnfurl
      extend Discordrb::EventContainer

      message do |event|
        next unless unfurl_enabled?
        next if event.from_bot?

        twitter = event.bot.twitter
        next unless (tweet_ids = twitter.extract_tweet_ids(event.message.content))

        tweets = twitter.fetch_tweets(tweet_ids)

        tweets.each do |tweet|
          event.message.reply!('', embed: build_embed(tweet))
        end
      end
    end
  end
end

def unfurl_enabled?
  ENV.key? 'ENABLE_TWITTER_UNFURL'
end

def build_embed(tweet)
  embed = Discordrb::Webhooks::Embed.new
  embed.thumbnail = { url: tweet.user_img }
  embed.color = '#1D9BF0'
  embed.url = tweet.url
  embed.title = "#{tweet.user_name} (@#{tweet.user_handle})"
  embed.description = tweet.text
  embed.image = { url: tweet.images.first } if tweet.images.first
  embed.footer = {
    text: "💬 #{hn(tweet.replies)}  🔁 #{hn(tweet.retweets)}  ❤️ #{hn(tweet.likes)}  🔖 #{hn(tweet.bookmarks)}  📊 #{hn(tweet.views)}"
  }
  embed.timestamp = tweet.created_at.to_time

  embed
end

def hn(number)
  number = number.to_i
  if number >= 1_000_000
    "#{(number.to_f / 1_000_000).round(1)}M"
  elsif number >= 1_000
    "#{(number.to_f / 1_000).round(1)}K"
  else
    number.to_s
  end
end

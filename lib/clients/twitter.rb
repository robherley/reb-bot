# frozen_string_literal: true

require 'date'
require 'json'
require 'uri'

module Rebbot
  module Clients
    # Hacks on Twitter's not-so-public GraphQL API client
    # Based heavily on: https://github.com/vercel/react-tweet/issues/76#issuecomment-1524087933
    class Twitter
      # this is the invariant bearer token that is used for all twitter guest auth
      GUEST_BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'
      HOSTS = %w[twitter.com mobile.twitter.com x.com].freeze
      TWEET_PATH_REGEX = %r{^/[^/]+/status/(\d+)$}.freeze

      class APIResponseError < StandardError; end

      class Tweet
        attr_reader :id, :created_at, :user_name, :user_handle, :user_img, :text, :images, :replies, :retweets, :likes, :bookmarks,
                    :views

        def initialize(raw_result)
          @id = raw_result['rest_id']
          @created_at = DateTime.parse(raw_result.dig('legacy', 'created_at'))

          user = raw_result.dig('core', 'user_results', 'result', 'legacy')
          @user_name = user['name']
          @user_handle = user['screen_name']
          @user_img = user['profile_image_url_https']

          display_text_range = raw_result.dig('legacy', 'display_text_range') || []
          @text = raw_result.dig('legacy', 'full_text')
          @text = @text[*display_text_range] if display_text_range.size == 2

          media = raw_result.dig('legacy', 'extended_entities', 'media') || []
          @images = media&.map { |m| m['media_url_https'] }&.compact || []

          @replies = raw_result.dig('legacy', 'reply_count')
          @retweets = raw_result.dig('legacy', 'retweet_count') + raw_result.dig('legacy', 'quote_count')
          @likes = raw_result.dig('legacy', 'favorite_count')
          @bookmarks = raw_result.dig('legacy', 'bookmark_count')
          @views = raw_result.dig('views', 'count')
        end

        def url
          "https://x.com/#{@user_handle}/status/#{@id}"
        end
      end

      def initialize; end

      def extract_tweet_ids(text)
        urls = URI.extract(text, %w[http https])
        urls.filter { |url| HOSTS.any? { |host| url.include? host } }

        return unless urls.any?

        urls.map do |url|
          next unless (match = TWEET_PATH_REGEX.match(URI.parse(url).path))

          match[1]
        end.compact
      end

      def fetch_tweets(ids)
        ids.map do |id|
          fetch_tweet(id)
        end
      end

      def fetch_tweet(id)
        response = api.get('https://api.twitter.com/graphql/ncDeACNGIApPMaqGVuF_rw/TweetResultByRestId') do |req|
          req.params['variables'] = {
            tweetId: id,
            # required or the api will 400
            includePromotedContent: true,
            withBirdwatchNotes: true,
            withCommunity: true,
            withDownvotePerspective: true,
            withReactionsMetadata: true,
            withReactionsPerspective: true,
            withSuperFollowsTweetFields: true,
            withSuperFollowsUserFields: true,
            withVoice: true
          }.to_json

          # required or the api will 400
          req.params['features'] = {
            freedom_of_speech_not_reach_fetch_enabled: true,
            graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
            interactive_text_enabled: true,
            longform_notetweets_consumption_enabled: true,
            longform_notetweets_richtext_consumption_enabled: true,
            responsive_web_edit_tweet_api_enabled: true,
            responsive_web_enhance_cards_enabled: true,
            responsive_web_graphql_exclude_directive_enabled: true,
            responsive_web_graphql_skip_user_profile_image_extensions_enabled: true,
            responsive_web_graphql_timeline_navigation_enabled: true,
            responsive_web_text_conversations_enabled: true,
            responsive_web_twitter_blue_verified_badge_is_enabled: true,
            standardized_nudges_misinfo: true,
            tweet_awards_web_tipping_enabled: true,
            tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
            tweetypie_unmention_optimization_enabled: true,
            verified_phone_label_enabled: true,
            vibe_api_enabled: true,
            view_counts_everywhere_api_enabled: true
          }.to_json
        end

        raw_result = response.body.dig('data', 'tweetResult', 'result')
        raise APIResponseError, 'Unexpected response' unless raw_result

        Tweet.new(raw_result)
      rescue Faraday::Error, JSON::ParserError => e
        puts e.response[:body] if e.is_a?(Faraday::Error) && e.response

        raise APIResponseError, "Error fetching tweet: #{e.message}"
      end

      private

      def api
        Faraday.new(
          headers: {
            'Authorization': "Bearer #{GUEST_BEARER}",
            'x-guest-token': guest_token
          }
        ) do |c|
          c.use Faraday::Response::RaiseError
          c.response :json
        end
      end

      def guest_token
        # no idea when it expires, so just get a new one after 15 minutes
        @guest_token = nil if @last_set && @last_set < Time.now - 60 * 15
        return @guest_token if @guest_token

        @last_set = Time.new

        response = Faraday.post('https://api.twitter.com/1.1/guest/activate.json') do |req|
          req.headers['Authorization'] = "Bearer #{GUEST_BEARER}"
        end

        raise APIResponseError, 'Error fetching guest token' unless response.status == 200

        @guest_token = JSON.parse(response.body)['guest_token']
      end
    end
  end
end

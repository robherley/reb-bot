# frozen_string_literal: true

# https://github.com/shardlab/discordrb/blob/dc27fe18463da3ccfd0f0266030aa7ad51b2c2b9/lib/discordrb/events/message.rb#L90
class Discordrb::Events::MessageEvent
  def from_admin?
    Rebbot::ADMIN_IDS.include? user.id
  end

  def from_test_server?
    Rebbot::TESTING_SERVER_ID == server.id
  end
end

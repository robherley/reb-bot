# frozen_string_literal: true

module Rebbot
  module Commands
    class Draw < Rebbot::Commands::Base
      on :draw, description: 'txt2img with stable diffusion'

      METHODS = ['Euler a', 'Euler', 'LMS', 'Heun', 'DPM2', 'DPM2 a', 'DDIM', 'PLMS'].freeze
      API_PATH = '/sdapi/v1/txt2img'

      def with_options(cmd)
        cmd.string('prompt', 'what to draw', required: true)
        cmd.string('negative', 'what to not to draw')
        cmd.number('cfg_scale', 'CFG scale (1-30, default: 7)', min_value: 1, max_value: 30)
        cmd.number('sampling_steps', 'sampling steps (1-150, default: 20)', min_value: 1, max_value: 150)
        cmd.string('sampling_method', 'sampling method (default: \'Euler a\')', choices: METHODS.map { |m| [m, m] })
        cmd.number('batch_size', 'batch size (1-8, default: 1)', min_value: 1, max_value: 8)
        cmd.number('width', 'image width (64-2048, default: 512)', min_value: 64, max_value: 2048)
        cmd.number('height', 'image height (64-2048, default: 512)', min_value: 64, max_value: 2048)
        cmd.number('seed', 'reproducible seed')
      end

      def on_event(event)
        opts = event.options.transform_keys(&:to_sym)

        invalid = check_opts(opts)
        return event.respond(content: "⚠️ Invalid option: #{invalid}") if invalid

        return event.respond(content: "😔 Server is offline, help! <@#{Rebbot::ROB_ID}>") if offline?

        send_initial_message(event)

        request_body = build_request(**opts)

        response = draw_api.post(API_PATH) do |req|
          req.body = request_body.to_json
        end

        json = JSON.parse(response.body)
        create_and_send_files(event, json['images'])
      rescue Faraday::Error, JSON::ParserError => e
        event.edit_response(content: "💀 An error occurred: #{e}, help! <@#{Rebbot::ROB_ID}>")
      end

      private

      def offline?
        response = draw_api.get do |req|
          req.url '/'
          req.options[:timeout] = 2
        end
        response.status != 200
      rescue Faraday::Error, Faraday::Timeout
        true
      end

      def draw_api
        Faraday.new(
          url: 'http://m1.lab.reb.gg:7860', # TODO: env var?
          headers: { 'Content-Type' => 'application/json' }
        ) do |c|
          c.use Faraday::Response::RaiseError
        end
      end

      def send_initial_message(event)
        message = "🎨 Drawing '#{event.options['prompt']}'"
        extra_args = event.options.except('prompt')
        message += " with #{extra_args.entries.map { |a, b| "`#{a}='#{b}'`" }.join(', ')}" unless extra_args.empty?

        event.respond(content: message)
      end

      def create_and_send_files(event, imgs)
        tmpfiles = []

        imgs.each do |img|
          tmpfile = Tempfile.new(['drawing', '.png'])
          tmpfiles << tmpfile
          tmpfile.write(Base64.decode64(img.split('base64,').last))
          tmpfile.rewind
        end

        event.send_message do |builder|
          builder.attachments = tmpfiles
        end
      ensure
        tmpfiles.each do |tmpfile|
          tmpfile.close
          tmpfile.unlink
        end
      end

      def check_opts(opts)
        %i[height width].each do |opt|
          next unless opts[opt]

          return "`#{opt}` cannot be greater than 2048" if opts[opt] > 2048
          return "`#{opt}` must be divisible by 64" unless (opts[opt] % 64).zero?
        end

        nil
      end

      # for more fields see: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API
      def build_request(
        prompt: '',
        negative: '',
        cfg_scale: 7,
        sampling_steps: 20,
        sampling_method: 'Euler a',
        batch_size: 1,
        width: 512,
        height: 512,
        seed: nil
      )
        {
          prompt: prompt,
          negative_prompt: negative,
          cfg_scale: cfg_scale,
          steps: sampling_steps,
          sampler_name: sampling_method,
          batch_size: batch_size,
          width: width,
          height: height,
          seed: seed
        }.compact
      end
    end
  end
end

# frozen_string_literal: true

module Rebbot
  module Commands
    class PPI < Rebbot::Commands::Base
      on :ppi, description: 'calculate the pixels per inch of a screen'

      def with_options(cmd)
        cmd.number('diagonal', 'screen diagonal in inches')
        cmd.integer('width', 'screen width in pixels')
        cmd.integer('height', 'screen height in pixels')
      end

      def on_event(event)
        opts = event.options.transform_keys(&:to_sym)

        invalid = check_opts(opts)
        return event.respond(content: "⚠️ Invalid option: #{invalid}") if invalid

        diag_pixels = Math.sqrt(opts[:width]**2 + opts[:height]**2)
        ppi = diag_pixels / opts[:diagonal]

        table = Terminal::Table.new do |t|
          t.style = { border: :unicode }
          t << ['Diagonal', "#{opts[:diagonal]} in"]
          t << ['Width', "#{opts[:width]} px"]
          t << ['Height', "#{opts[:height]} px"]
          t << :separator
          t << ['PPI', "#{ppi.round(2)} px"]
        end

        event.respond(content: "```🖥️ PPI Calculator 📏\n#{table}```")
      end

      private

      def check_opts(opts)
        %i[diagonal height width].each do |opt|
          return "`#{opt}` must be greater than zero" if opts[opt] <= 0
        end

        nil
      end
    end
  end
end
